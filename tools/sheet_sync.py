#!/usr/bin/env python3
"""Publish the repo's control plane to the Monad Blitz Google Sheet.

One-way: repo -> sheet. The sheet is a *view*, never a source of truth.
Per docs/DOC-SYSTEM.md the owning docs win; editing the sheet changes nothing
and will be overwritten on the next run.

Usage:  ~/.venvs/monad-sheets/bin/python tools/sheet_sync.py [--dry-run]
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import google.auth
from googleapiclient.discovery import build

_ID_FILE = Path.home() / ".monad-gate/sheet.env"
VAULT = Path(os.environ.get("MONAD_SECRETS_FILE",
                            Path.home() / ".monad-gate/secrets.json"))
SHEET_ID = os.environ.get("MONAD_SHEET_ID") or (
    _ID_FILE.read_text().strip() if _ID_FILE.exists() else "")
REPO = Path(__file__).resolve().parent.parent
RPC = "https://testnet-rpc.monad.xyz"
CAST = Path.home() / ".foundry/bin/cast"


# ---------------------------------------------------------------- helpers
def read(rel):
    p = REPO / rel
    return p.read_text() if p.exists() else ""


def git(*args):
    try:
        return subprocess.run(["git", "-C", str(REPO), *args],
                              capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return ""


def balance(addr):
    if not addr or not CAST.exists():
        return "n/a"
    try:
        out = subprocess.run([str(CAST), "balance", addr, "--rpc-url", RPC],
                             capture_output=True, text=True, timeout=25)
        wei = out.stdout.strip()
        if not wei.isdigit():
            return "unreachable"
        return "0 (UNFUNDED)" if wei == "0" else "%.4f MON" % (int(wei) / 1e18)
    except Exception:
        return "unreachable"


def unwrap(text):
    """Join hard-wrapped markdown lines into one paragraph."""
    return re.sub(r"\s+", " ", text).strip().strip("`")


# ---------------------------------------------------------------- parsers
def parse_lanes():
    """Active lanes from '### ID — title [STATUS]' blocks, plus closed bullets."""
    md = read("control-plane/ACTIVE_LANE_BOARD.md")
    rows = []

    blocks = re.split(r"^### ", md, flags=re.M)[1:]
    for b in blocks:
        head, _, body = b.partition("\n")
        m = re.match(r"(\S+)\s+—\s+(.*?)\s*\[(.+?)\]\s*$", head)
        if not m:
            continue
        lane, title, status = m.groups()
        body = body.split("\n## ")[0]
        fields = {}
        key = None
        for line in body.splitlines():
            fm = re.match(r"([A-Z][A-Za-z\- ]+):\s*(.*)$", line)
            if fm:
                key = fm.group(1).strip()
                fields[key] = fm.group(2)
            elif key and line.strip():
                fields[key] += " " + line.strip()
            elif not line.strip():
                key = None
        rows.append([
            lane, title, status,
            unwrap(fields.get("Owner", "")),
            unwrap(fields.get("Depends on", "")),
            unwrap(fields.get("Acceptance", "")),
            unwrap(fields.get("Notes", "") + " " + fields.get("Progress 2026-07-26", ""))[:900],
        ])

    closed = md.split("## Recently closed", 1)
    if len(closed) > 1:
        chunk = closed[1].split("\n## ")[0]
        for m in re.finditer(r"- \*\*(\S+) — (.*?)\*\* \[(.*?)\] — (.*?)(?=\n- \*\*|\Z)",
                             chunk, flags=re.S):
            lane, title, status, note = m.groups()
            rows.append([lane, title, status, "", "", "", unwrap(note)[:900]])
    return rows


def parse_questions():
    md = read("docs/OPEN-QUESTIONS.md")
    rows = []
    section = ""
    for part in re.split(r"^(## .*)$", md, flags=re.M):
        if part.startswith("## "):
            section = part[3:].strip()
            continue
        for m in re.finditer(r"^### (Q\d+)\s+—\s+(.*?)$(.*?)(?=^### |\Z)",
                             part, flags=re.M | re.S):
            qid, title, body = m.groups()
            am = re.search(r"\*\*Answer(.*?):\*\*(.*?)(?=\n\*\*|\Z)", body, flags=re.S)
            answer = unwrap(am.group(2)) if am else ""
            label = (am.group(1) if am else "")
            status = "defaulted — unconfirmed" if "defaulted" in label else (
                "answered" if answer else "OPEN")
            rows.append([qid, section, title.strip(), status, answer[:900]])
    return rows


def parse_evidence():
    md = read("control-plane/ENGINEERING_SUPERVISOR.md")
    rows = []
    for m in re.finditer(r"^## (\S+) — (\S+) — (.*?)$(.*?)(?=^## |\Z)", md, flags=re.M | re.S):
        date, lane, title, body = m.groups()
        got = {}
        for bm in re.finditer(r"- \*\*(.*?):\*\*(.*?)(?=\n- \*\*|\Z)", body, flags=re.S):
            got[bm.group(1).strip()] = unwrap(bm.group(2))
        rows.append([date, lane, title.strip(), got.get("Owner", ""),
                     got.get("Verified", "")[:700],
                     got.get("Material finding", got.get("Material findings", ""))[:700],
                     got.get("Remains", "")[:700]])
    rows.sort(key=lambda r: r[0], reverse=True)
    return rows


def parse_chain():
    m = json.loads(read("packages/abi/addresses.json") or "{}")
    dep, agt, gate = m.get("deployerPrincipal", ""), m.get("agent", ""), m.get("gate", "")
    exp = m.get("explorerBase", "")
    rows = [
        ["chainId", str(m.get("chainId", "")), ""],
        ["rpcUrl", m.get("rpcUrl", ""), ""],
        ["explorerBase", exp, ""],
        ["gate contract", gate or "NOT DEPLOYED", f"{exp}/address/{gate}" if gate else ""],
        ["actionId TRANSFER_MOCK", m.get("actionIdTransferMock", ""), ""],
        ["deployer + principal", dep, f"{exp}/address/{dep}" if dep else ""],
        ["  balance", balance(dep), ""],
        ["agent", agt, f"{exp}/address/{agt}" if agt else ""],
        ["  balance", balance(agt), ""],
    ]
    return rows


def parse_secrets():
    """Operator-visible credential vault.

    Tejas asked for every generated wallet/secret to land in the sheet
    (2026-07-26). The sheet is shared with exactly two identities and these are
    throwaway testnet burners, so the material lives here in the clear on
    purpose. Nothing with real value may ever be added.
    """
    if not VAULT.exists():
        return [["(no vault)", "", "", "", "", "", "", "", str(VAULT) + " not found"]]
    v = json.loads(VAULT.read_text())
    return [[s.get("name", ""), s.get("kind", ""), s.get("role", ""),
             s.get("address", ""), s.get("private_key", ""), s.get("password", ""),
             s.get("keystore", ""), s.get("created", ""), s.get("notes", "")]
            for s in v.get("secrets", [])]


def blocker(manifest, active):
    """Derive the current blocker from state, never hardcode it."""
    unfunded = [r[0] for r in parse_chain()
                if r[0].strip() == "balance" and "UNFUNDED" in r[1]]
    if unfunded:
        return "ENV-1 - burner wallets unfunded"
    if not manifest.get("gate"):
        return "BE-3 - contract not deployed (wallets funded, path clear)"
    open_lanes = ", ".join(sorted(r[0] for r in active))
    return "open lanes: " + (open_lanes or "none")


def build_status(lanes):
    active = [r for r in lanes if not r[2].startswith("CLOSED")]
    closed = [r for r in lanes if r[2].startswith("CLOSED")]
    manifest = json.loads(read("packages/abi/addresses.json") or "{}")
    return [
        ["generated (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")],
        ["source", "repo -> sheet, one way. Editing this sheet changes nothing."],
        ["branch", git("branch", "--show-current")],
        ["head", git("log", "--oneline", "-1")],
        ["main behind by", git("rev-list", "--count", "main..HEAD") + " commits"],
        ["remotes", ", ".join(sorted(set(git("remote").split())))],
        ["lanes active", str(len(active))],
        ["lanes closed", str(len(closed))],
        ["contract deployed", "yes" if manifest.get("gate") else "NO — BE-3 pending"],
        ["blocking now", blocker(manifest, active)],
        ["secrets tab", "testnet burners in the clear, by operator decision - "
                        "never put a mainnet or funded key here"],
    ]


# ---------------------------------------------------------------- sheet io
TABS = ["Status", "Lanes", "Chain", "Decisions", "Evidence", "Secrets"]
HEADERS = {
    "Status": ["Field", "Value"],
    "Lanes": ["Lane", "Title", "Status", "Owner", "Depends on", "Acceptance", "Notes"],
    "Chain": ["Field", "Value", "Explorer"],
    "Decisions": ["Q", "Section", "Question", "Status", "Answer"],
    "Evidence": ["Date", "Lane", "Title", "Owner", "Verified", "Material finding", "Remains"],
    "Secrets": ["Name", "Kind", "Role", "Address", "Private key", "Keystore password",
                "Keystore path", "Created", "Notes"],
}


def ensure_tabs(svc):
    meta = svc.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    have = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}
    reqs = []
    if "Sheet1" in have and "Status" not in have:
        reqs.append({"updateSheetProperties": {
            "properties": {"sheetId": have["Sheet1"], "title": "Status"}, "fields": "title"}})
        have["Status"] = have.pop("Sheet1")
    for t in TABS:
        if t not in have:
            reqs.append({"addSheet": {"properties": {"title": t}}})
    if reqs:
        svc.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": reqs}).execute()
        meta = svc.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
        have = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}
    return have


def style(svc, ids):
    reqs = []
    for t in TABS:
        sid = ids[t]
        reqs += [
            {"repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
                "cell": {"userEnteredFormat": {
                    "textFormat": {"bold": True},
                    "backgroundColor": {"red": 0.16, "green": 0.11, "blue": 0.27},
                    "horizontalAlignment": "LEFT"}},
                "fields": "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)"}},
            {"repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
                "cell": {"userEnteredFormat": {"textFormat": {
                    "bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}}},
                "fields": "userEnteredFormat.textFormat"}},
            {"updateSheetProperties": {
                "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}},
                "fields": "gridProperties.frozenRowCount"}},
            {"autoResizeDimensions": {"dimensions": {
                "sheetId": sid, "dimension": "COLUMNS",
                "startIndex": 0, "endIndex": len(HEADERS[t])}}},
        ]
    svc.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": reqs}).execute()


def main():
    dry = "--dry-run" in sys.argv
    if not SHEET_ID and not dry:
        sys.exit("no sheet id: set MONAD_SHEET_ID or write it to ~/.monad-gate/sheet.env")
    lanes = parse_lanes()
    data = {
        "Status": build_status(lanes),
        "Lanes": lanes,
        "Chain": parse_chain(),
        "Decisions": parse_questions(),
        "Evidence": parse_evidence(),
        "Secrets": parse_secrets(),
    }
    for t in TABS:
        print(f"{t}: {len(data[t])} rows")
    if dry:
        for t in TABS:
            print("\n==", t, "==")
            if t == "Secrets":
                print("   (%d rows, redacted)" % len(data[t]))
                continue
            for r in data[t][:4]:
                print("  ", [str(c)[:60] for c in r])
        return

    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/spreadsheets"])
    svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
    ids = ensure_tabs(svc)
    svc.spreadsheets().values().batchClear(
        spreadsheetId=SHEET_ID, body={"ranges": TABS}).execute()
    svc.spreadsheets().values().batchUpdate(spreadsheetId=SHEET_ID, body={
        "valueInputOption": "RAW",
        "data": [{"range": f"{t}!A1", "values": [HEADERS[t]] + data[t]} for t in TABS],
    }).execute()
    style(svc, ids)
    print("synced -> https://docs.google.com/spreadsheets/d/%s/edit" % SHEET_ID)


if __name__ == "__main__":
    main()
