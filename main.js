const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');
const pageMake = require('./page-making.js');
const prompt = require('prompt-sync')();


const AUTHORS = ["Chad", "Kyle"];

function readArticle(title, text, imageRef) {
  // This function will do something with the provided data
}

function readUserData(articleList) {
  // read user data and return an object with the relevant fields
    if (!fs.existsSync('input.json')) return;
    console.log("reading input");
    let data = fs.readFileSync('input.json');
    if (!data) 
    {
        console.log("no data...");
        return;
    }
    let articleObject = JSON.parse(data);
    // make sure no dupes
    for (const articleDat of articleObject)
    {
        if (articleDat.hasOwnProperty('title') && articleDat.hasOwnProperty('text') && articleDat.hasOwnProperty('imageRef'))
        {
            articleDat.parseTitle = articleDat.title.replace(/ /g,"_").toLowerCase();
            articleList.unshift(articleDat);
        }
        else {
            console.log("Make sure input article objects have necessary keys");
        }
    }
}

const ABSOLUTE_LINK = "https://unicyclegurus.com";
// holds the data for each article
var articlesData = [];
const inputArticlesData = [];

var nameList = [];

const OUTPUT_DIR = "output/blog";

function GetArticleInput()
{
    let title = "";
    let text = "";
    let imageRef = "";
    let description = "";
    // author
    title = prompt("Enter a new article title (newest first, leave blank if none) (try to keep under 50-60 chars): ");
    while (title != "") 
    {
        text = prompt("Enter article content: ");
        imageRef = prompt("Enter img title: ");

        if (text == "" || imageRef == "")
        {
            console.log("Didn't add this article.");
            break;
        }
        imageRef = "media/" + imageRef;
        const parseTitle = title.replace(/ /g,"_").toLowerCase();
        inputArticlesData.push({title, parseTitle, text, imageRef});
        console.log(`Saved article ${title}`);
        
        title = prompt("Enter a new article name (leave blank if none): ");
    }
    console.log("Continuing...");
    if (inputArticlesData.length > 0)
    {
        let obj = JSON.stringify(inputArticlesData);
        fs.writeFileSync("input.json", obj);
    }
}

// Read the input HTML file
//const inputHtml = fs.readFileSync('input.html', 'utf-8');
async function cheerioStuff()
{
    // download wp
    const axiosResponse = await axios.request({
        method: "GET",
        url: ABSOLUTE_LINK,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
                }
    });
    const $ = cheerio.load(axiosResponse.data);
    AfterPulledThing($);
}



/* 
from https://stackoverflow.com/questions/12369824/javascript-binary-search-insertion-preformance
    target: the object to search for in the array
    comparator: (optional) a method for comparing the target object type
    return value: index of a matching item in the array if one exists, otherwise the bitwise complement of the index where the item belongs
*/
Array.prototype.binarySearch = function (target, comparator) {
    var l = 0,
        h = this.length - 1,
        m, comparison;
    comparator = comparator || function (a, b) {
        return (a < b ? -1 : (a > b ? 1 : 0)); /* default comparison method if one was not provided */
    };
    while (l <= h) {
        m = (l + h) >>> 1; /* equivalent to Math.floor((l + h) / 2) but faster */
        comparison = comparator(this[m], target);
        if (comparison < 0) {
            l = m + 1;
        } else if (comparison > 0) {
            h = m - 1;
        } else {
            return m;
        }
    }
    return~l;
};
/*
    target: the object to insert into the array
    duplicate: (optional) whether to insert the object into the array even if a matching object already exists in the array (false by default)
    comparator: (optional) a method for comparing the target object type
    return value: the index where the object was inserted into the array, or the index of a matching object in the array if a match was found and the duplicate parameter was false 
*/
Array.prototype.binaryInsert = function (target, duplicate, comparator) {
    var i = this.binarySearch(target, comparator);
    if (i >= 0) { /* if the binarySearch return value was zero or positive, a matching object was found */
        if (!duplicate) {
            return ~i;
        }
    } else { /* if the return value was negative, the bitwise complement of the return value is the correct index for this object */
        i = ~i;
    }
    this.splice(i, 0, target);
    return i;
};

// TODO:
// go thru link to get full data so you can change the preview size
// Loop through the article elements and extract the relevant data
function AfterPulledThing($){
    // Find all article elements in the input HTML file
    const articleElements = $('article');
    console.log(articleElements.length);
    let waitingOn = articleElements.length;
    articleElements.each((i, element) => {
        const title = $(element).find('h2').text();
        console.log("I: " +i)
        const imageRef = $(element).find('img').attr('src');
        const parseTitle = title.replace(/ /g,"_").toLowerCase();
        let indexx = nameList.binaryInsert(parseTitle);
        
        if (indexx < 0) {
            throw new Error("Duplicate article: " + parseTitle);
            console.log("Found a duplicate article name!!!" + parseTitle);
            console.log("Skipping this article.");
            return;
        }
        articlesData.push({ title, parseTitle, text: "", imageRef });
        GetArticleText($, element).then(result => {
            articlesData[i].text = result;
            waitingOn -= 1;
            if (waitingOn == 0) {
                GotData();
            }
        });
    });
    console.log(articlesData);

}
function GotData()
{
    // check input articles aren't a dupe of existing ones
    for (articleDat of inputArticlesData)
    {
        parseTitle = articleDat.parseTitle;
        let indexx = nameList.binaryInsert(parseTitle);
            
        if (indexx < 0) {
            throw new Error("Duplicate article (from input): " + parseTitle);
            console.log("Found a duplicate article name!!!" + parseTitle);
            console.log("Skipping this article.");
            return;
        }
    }

    articlesData = inputArticlesData.concat(articlesData);
    
    console.log(articlesData);

    // first delete output dir
    fs.rmSync("output", { recursive: true, force: true });
    pageMake.GenBlogPages(articlesData, OUTPUT_DIR);

    pageMake.GenBlogPreviewPage(articlesData, OUTPUT_DIR);
    fs.copyFileSync("style.css", "output/style.css");
}

async function GetArticleText($, element)
{
    // get data from full post
    const articleUrl = $(element).find('a').attr('href');

    // download wp
    const axiosResponse = await axios.request({
        method: "GET",
        url: articleUrl,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
                }
    });
    const $article = cheerio.load(axiosResponse.data);

    //let post_text = $article('#text-body').text();
    let post_text = $article('.article-full p').text();
    return post_text;
}


function main() {
    // would you like to use previously stored input?
    // just adding one article - gen html main page and article page w/out scraping
    // add a warning that folder doesn't contain whole site
    // copy css over
    // cut text on preview
    // make sure flexbox doesn't cut out preview link
    GetArticleInput();
    cheerioStuff();
}
main();