# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

Every git command that creates a commit (including `git merge`, which auto-commits) must be prefixed with the date environment variables so the commit is dated `{{COMMIT_DATE}}`. If `{{COMMIT_DATE}}` is empty, run the commands normally without the date prefix.

For each branch:

1. Run `GIT_AUTHOR_DATE="{{COMMIT_DATE}}" GIT_COMMITTER_DATE="{{COMMIT_DATE}}" git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `npm run typecheck` and `npm run test` to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge:

```
GIT_AUTHOR_DATE="{{COMMIT_DATE}}" GIT_COMMITTER_DATE="{{COMMIT_DATE}}" git commit -m "<message>"
```

Write the commit message as a normal, human-authored message. Do NOT mention Claude, AI, agents, automation, Sandcastle, Ralph, or any other tool or entity. Do NOT add a `Co-Authored-By` trailer or any "Generated with …" line.

# CLOSE ISSUES

For each branch that was merged, close its issue using the following command:

`gh issue close <ID> --comment "Completed by Sandcastle"`

Here are all the issues:

{{ISSUES}}

Once you've merged everything you can, output <promise>COMPLETE</promise>.
