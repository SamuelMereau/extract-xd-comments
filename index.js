const puppeteer = require('puppeteer');
const { parse } = require('node-html-parser');
const fs = require('fs');
const config = require('./config.json');

(() => {
    /**
     * @param {string} str 
     * @returns {string}
     */
    function replaceComma(str) {
        return str.replace(/,/g, '-');
    }

    async function fetchComments() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(config.url);
        
        // Wait for specific DOM content to load
        await page.waitForSelector('#ccx-comments-list li', {visible: true});

        const comments = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("#ccx-comments-list section"), commentSection => commentSection.innerHTML)
        });

        await browser.close();

        constructCsv(comments);
    }

    /**
     * @param {Array} data 
     */
    function constructCsv(data) {
        const html = parse("<div>"+data.join("")+"</div>");

        let csvArray = [],
            sectionName = "",
            userName = "",
            annotation = " ",
            comment = "",
            changed = 0;
        
        [].forEach.call(html.childNodes[0].childNodes, (el, i) => {
            if (el.querySelector('button')) {
                sectionName = el.querySelector("span").childNodes[0].textContent;
                csvArray.push(`${sectionName}, - , - ,-\n`);
            }
            if (el.rawTagName == "ul") {
                for (const li of [...el.querySelectorAll("li")]) {
                    if (li.querySelectorAll(".user-name").length > 0) {
                        userName = li.querySelectorAll(".user-name")[0].childNodes[0].textContent;
                        changed = 1;
                    }
                    if (li.querySelectorAll(".comment-text").length > 0) {
                        comment = li.querySelectorAll(".comment-text span div")[0].textContent;
                        comment = comment.replace(/(\r\n|\n|\r)/gm,"");
                        changed = 1;
                    }
                    if (li.querySelectorAll(".annotation-marker").length > 0) {
                        annotation = li.querySelectorAll(".annotation-marker")[0].textContent;
                        changed = 1;
                    } else (annotation = " ");
                    pushIfChanged();
                }
            }
        
            pushIfChanged();
            
        });
        
        function pushIfChanged() {
            if (changed) {
                csvArray.push (
                    replaceComma(sectionName) + 
                    "," + replaceComma(userName) + 
                    ",\"" + replaceComma(comment) + 
                    "\"," + annotation + 
                    "\n"
                );

                changed = 0;
            }
        }

        createCsvDocument(csvArray.join(""));
    }

    /**
     * @param {String} csvData 
     */
    function createCsvDocument(csvData) {
        fs.writeFile(`./out/${config.fileName ?? ''}.csv`, csvData, 'ascii', function (err) {
            if (err) {
                console.log('Some error occured - file either not saved or corrupted file saved.');
            } else{
                console.log('CSV file created successfully');
            }
        });
    }

    fetchComments();
})();