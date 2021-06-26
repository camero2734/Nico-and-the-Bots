files=("./src/configuration/secrets.json" "./src/helpers/verified-quiz/quiz.ts")

echo $(pwd)

# Save hidden files b/c git removes them when switching back
for i in ${!files[@]};
do
    files[$i]=$(cat "${files[$i]}")
done

printf '%s\n' "${files[@]}"