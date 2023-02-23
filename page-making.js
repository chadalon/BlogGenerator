const cheerio = require('cheerio');
const fs = require('fs');

const MAIN_URL = "https://unicyclegurus.com";

function GenBlogPreviewPage(articlesData, output_dir) {

    // Read the template HTML file
    const templateHtml = fs.readFileSync('home template.html', 'utf-8');
    const $template = cheerio.load(templateHtml);
    // reference main tag
    const $main = $template('main');
    // reference article tag so we can copy properties
    const articleTemplate = $template('article');

    for (let j = articlesData.length - 1; j >= 0; j -= 1) {
        let articleData = articlesData[j];
        let articleDupe = articleTemplate.clone();
        if (articleData.text == "") throw new Error("NO TEXT FOUND IN POST!!!");
        articleDupe.attr('id', articleData.parseTitle);
        $template(articleDupe).find('h2').text(articleData.title);
        $template(articleDupe).find('p').text(articleData.text.substring(0, 100) + "...");
        $template(articleDupe).find('img').attr('src', articleData.imageRef);
        $template(articleDupe).find('a').attr('href', MAIN_URL + "/blog/" + articleData.parseTitle + '.html');
        $main.prepend($template.html(articleDupe));
    }
    articleTemplate.remove();


    // Generate the output HTML code with cheerio
    const outputHtml = $template.html();

    fs.mkdirSync(output_dir, { recursive: true });

    // Write the final HTML to a file
    fs.writeFileSync('output/index.html', outputHtml);
}

// TODO:
// make finding search for ids instead of elements - in case
// you change the elements in the future

// in the future, add option to only gen one page
function GenBlogPages(articlesData, output_dir) {
    const templateHtml = fs.readFileSync('page template.html', 'utf-8');
    const $ = cheerio.load(templateHtml);
    for (const articleData of articlesData)
    {
        let artElem = $('article');
        $(artElem).find('h2').text(articleData.title);
        // also set title tag for seo
        $('title').text(articleData.title);
        $('#text-body').text(articleData.text);
        $(artElem).find('img').attr('src', "../" + articleData.imageRef);

        const outputHtml = $.html();
        
        fs.mkdirSync(output_dir, { recursive: true });
        fs.writeFileSync(output_dir + '/' + articleData.parseTitle + ".html", outputHtml);
    }
    
}

module.exports = { GenBlogPreviewPage, GenBlogPages };