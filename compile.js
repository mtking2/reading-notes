const fs = require('fs');
const path = require('path');

const pug = require('pug');
const sass = require('node-sass');
const fm = require('front-matter');



function compileBooks(callback) {
  var books = [];
  var files = fs.readdirSync('src/books');
  files.forEach(file => {

    var contents = fs.readFileSync(`src/books/${file}`, 'utf8');
    let data = fm(contents);

    // console.log(data);
    let book = {
      meta: data.attributes,
      filename: file.replace('.md',''),
      body: data.body
    };
    books.push(book);

    let pugString = `
    \rextends ../layout
    \rappend variables
    \r  - var isBook = true
    \rblock content
    \r  div(id=filename).notes
    \r    if meta.title
    \r      h1: u= meta.title
    \r    if meta.author
    \r      h3: em By #{meta.author}
    \r    hr
    \r    if meta.image_url
    \r      center
    \r        img(src=meta.image_url alt=meta.title || 'image')
    \r    div.chapsums
    \r      :markdown-it(linkify html=true langPrefix='lang-')
    \r        ${(book.body).replace(/\n/g,'\n        ')}
    `;
    // console.log(pugString)

    let html = pug.compile(pugString, { pretty: true, filename: `src/pages/${book.filename}.pug`})(book);
    // console.log(html)

    fs.writeFileSync(`books/${book.filename}.html`, html);
    console.log(`CREATE FILE: books/${file.replace('.pug','.html')}`)

  });

  callback({ books: books });
}

compileBooks(function(books) {
  // console.log(books);

  var html = pug.compileFile('src/index.pug', { pretty: true })(books);

  fs.writeFile('index.html', html, function (err) {
    if (err) return console.error(err)
    console.log('CREATE FILE: index.html')
  });

  var sassSrc = 'src/styles/main.sass'
  sass.render({
    file: sassSrc,
    outFile: "main.css",
  }, function(error, result) { // node-style callback from v3.0.0 onwards
    if(!error){
      // No errors during the compilation, write this result on the disk
      fs.writeFile("main.css", result.css, function(err){
        if(!err){
          console.log('CREATE FILE: main.css')
        }
      });
    }
  });

});
