mkdir logs
java -jar node_modules/selenium-server-standalone-2.25.0.jar -log logs/seleniumserver.log -Dwebdriver.chrome.bin="/opt/google/chrome/google-chrome" -Dwebdriver.chrome.driver="/home/daniel/bin/chromedriver" &
buster server &
cd site/
http-server -p 8000 > ../logs/httpserver.log &
cd -
cd test/resource-server-root
http-server -p 8001 > ../../logs/resource-server.log &
cd -
