# METIS Academy Continuous Execution Rule

At the start of every session:
1. Read `quality/state.yaml`.
2. Read `quality/backlog.yaml`.
3. Run `pnpm quality:status`.
4. Run `pnpm quality:release-lock`.
5. If release-lock is non-zero, NEVER declare completion.
6. Select the highest-priority unresolved work item (via `pnpm quality:next`).
7. Implement it completely.
8. Run focused tests and regression tests.
9. Perform GUI validation when the change is user-visible.
10. Update state/backlog/evidence (`pnpm quality:sync`).
11. Immediately continue to the next work item.
12. Progress reports are not stop points.
13. Only stop when release-lock passes and cleanAuditRounds >= 3.

macOS is out of scope by product decision.
External human playtesting is optional and non-blocking.
Do not ask the user to perform internal QA — the agent performs GUI validation itself.

## Execution loop (the ONLY work mode)

```
release-lock → quality:next → execute → verify → fix → release-lock → ...
```

- Source code + current Git SHA is the single source of truth. Never trust old Markdown reports.
- Evidence files (`quality/evidence/*.json`) are SHA-keyed; any product change invalidates them.
- If the backlog is empty but release-lock fails, run a fresh independent audit (`pnpm quality:audit`) and create new issues.
- Requirements thresholds live ONLY in `quality/requirements/latest.yaml`. Never hardcode thresholds in scripts.
- Forbidden phrases until exit 0: "RELEASE READY", "最终交付", "全部完成".
