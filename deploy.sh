files=("./src/configuration/secrets.json" "./src/helpers/verified-quiz/quiz.ts")
fileVals=("${a[@]}") 

git switch heroku && # Switch to branch that has secret files
cp .gitignore.heroku .gitignore &&
git add -A && # Add any new files
git merge main -s recursive -X ours && # Ignore different .gitignore file
git push -u heroku +HEAD:master # Push to heroku main branch

# Save hidden files b/c git removes them when switching back
for i in ${!files[@]};
do
    fileVals[$i]=$(cat "${files[$i]}")
done

cp .gitignore.main .gitignore
git switch main

# Rewrite hidden files
for i in ${!files[@]};
do
    echo "${fileVals[$i]}" > "${files[$i]}"
done