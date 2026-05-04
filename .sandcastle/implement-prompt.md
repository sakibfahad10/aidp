# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view <ID>`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits and run tests.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run `npm run typecheck` and `npm run test` to ensure the tests pass.

# GIT IDENTITY

This issue is assigned to a specific team member. Before making any commit, set the git identity so the commit is authored by them:

```
git config user.name "{{ASSIGNEE_USERNAME}}"
git config user.email "{{ASSIGNEE_EMAIL}}"
```

If `{{ASSIGNEE_EMAIL}}` or `{{ASSIGNEE_USERNAME}}` is empty, skip this step and keep the default git identity.

# COMMIT

Make a git commit. The commit message must:

1. Include task completed + PRD reference
2. Key decisions made
3. Files changed
4. Blockers or notes for next iteration

Keep it concise.

Write it as a normal, human-authored commit message. Do NOT mention Claude, AI, agents, automation, Sandcastle, Ralph, or any other tool or entity. Do NOT add a `Co-Authored-By` trailer or any "Generated with …" line.

Set the commit date by prefixing the commit command with the date environment variables. Use this exact form for every commit you make in this run:

```
GIT_AUTHOR_DATE="{{COMMIT_DATE}}" GIT_COMMITTER_DATE="{{COMMIT_DATE}}" git commit -m "<message>"
```

If `{{COMMIT_DATE}}` is empty, commit normally without the date prefix.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
