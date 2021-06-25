git switch heroku # Switch to branch that has secret files
git merge main -s ours # Ignore different .gitignore file
git push -u heroku +HEAD:master # Push to heroku main branch