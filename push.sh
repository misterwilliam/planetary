set -e

git checkout gh-pages
git merge master -m 'automatic merge'
./build.sh
git add main.js main.js.map
git commit -m 'automatic commit of compiled js'
git push origin gh-pages
git checkout master
