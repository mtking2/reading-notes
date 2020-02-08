require('dotenv').config()

const fs = require('fs');
const path = require('path');
const request = require('request');
const parseString = require('xml2js').parseString

const pug = require('pug');
const sass = require('node-sass');
const fm = require('front-matter');

function getBookData(isbn) {
  return new Promise(function(resolve, reject) {
    if (!isbn) return resolve()
    request.get(`https://www.goodreads.com/book/isbn/${isbn}?key=${process.env.GOODREADS_KEY}`, function (error, resp, body) {
      if (error) return reject(error)
      parseString(' '+body, function(parseErr, result) {
        if (parseErr) return reject(parseErr)
        let grBook = result.GoodreadsResponse.book[0]
        resolve(grBook);
      });
    });
  });
}

async function compileBooks() {
  var books = [];
  var files = fs.readdirSync('src/books');
  for (let i in files) {
    let file = files[i];

    var contents = fs.readFileSync(`src/books/${file}`, 'utf8');
    let data = fm(contents);

    let book = {
      meta: data.attributes,
      filename: file.replace('.md',''),
      body: data.body
    };

    let grBook = await getBookData(book.meta.isbn).catch( (error) => {
      console.error(error);
    });
    if (grBook) {
      book.meta.title = book.meta.title || grBook.title[0]
      book.meta.author = book.meta.author || grBook.authors[0].author[0].name
      let image_url = grBook.image_url[0].replace(/\._.*_\./, '.');
      if (!image_url.includes('nophoto')) {
        book.meta.image_url = book.meta.image_url || grBook.image_url[0].replace(/\._.*_\./, '.')
      }
    }

    books.push(book);

    let pugString = `
    \rextends ../layout
    \rappend variables
    \r  - var isBook = true
    \rblock content
    \r  div(id=filename).notes
    \r    h1: u= meta.title
    \r    h3: em By #{meta.author}
    \r    - var date = new Date(new Date().setHours(0,0,0,0))
    \r    if new Date(meta.updated) > date.setDate(date.getDate() - 30)
    \r      div.jump-to-latest
    \r        a.jump-to-latest-link(href='#latest').
    \r          #[span.notification-badge.notification-badge-left]
    \r          Jump to latest update
    \r    hr
    \r    if meta.image_url
    \r      center
    \r        img(src=meta.image_url alt=meta.title || 'image')
    \r    div.chapsums
    \r      :markdown-it(linkify html=true)
    \r        ${(book.body).replace(/\n/g,'\n        ')}
    `;

    let html = pug.compile(pugString, { pretty: true, filename: `src/pages/${book.filename}.pug`})(book);

    let filename = path.join( __dirname, `./dist/books/${book.filename}.html`);
    fs.mkdirSync(path.join( __dirname, '.dist/books'));
    fs.writeFileSync(filename, html);
    console.log(`CREATE FILE: ${filename}`)

  }

  return { books: books };
}

compileBooks().then( (books) => {

  var html = pug.compileFile(path.join( __dirname, 'src/index.pug'), { pretty: true })(books);

  fs.writeFile(path.join( __dirname, './dist/index.html'), html, function (err) {
    if (err) return console.error(err)
    console.log('CREATE FILE: dist/index.html')
  });

  var sassSrc = path.join( __dirname, 'src/styles/main.sass')
  sass.render({
    file: sassSrc,
    outFile: 'main.css',
  }, function(error, result) { // node-style callback from v3.0.0 onwards
    if(!error){
      // No errors during the compilation, write this result on the disk
      fs.writeFile(path.join( __dirname, './dist/main.css'), result.css, function(err){
        if(!err){
          console.log('CREATE FILE: dist/main.css')
        }
      });
    }
  });
});
