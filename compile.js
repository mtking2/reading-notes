require("dotenv").config();

const fs = require("fs");
const path = require("path");
const axios = require("axios").default;
const parseString = require("xml2js").parseString;

const pug = require("pug");
const sass = require("node-sass");

const showdown = require("showdown");
showdown.setFlavor("github");
const converter = new showdown.Converter();

const fm = require("front-matter");

var pugFilters = {
  showdown: (text, _options) => {
    return converter.makeHtml(text);
  },
};

getBookData = isbn => {
  return new Promise((resolve, reject) => {
    if (!isbn) return resolve();
    axios
      .get(`https://www.goodreads.com/book/isbn/${isbn}?key=${process.env.GOODREADS_KEY}`)
      .then(response => {
        parseString(response.data, (parseErr, result) => {
          if (parseErr) return reject(parseErr);
          let grData = result.GoodreadsResponse.book[0];
          axios
            .get(`https://www.goodreads.com/review/show_by_user_and_book.xml?key=${process.env.GOODREADS_KEY}&user_id=${process.env.GOODREADS_USER_ID}&book_id=${grData.id}`)
            .then(resp => {
              parseString(resp.data, (parseErr, result) => {
                if (parseErr) return reject(parseErr);
                let review = result.GoodreadsResponse.review[0];
                resolve({
                  book: review.book[0],
                  shelves: review.shelves[0].shelf.map( s => s.$.name)
                });
              });
            })
            .catch(error => {
              return reject(error);
            });
        });
      })
      .catch(error => {
        return reject(error);
      });
  });
}

getBookShelf = shelves => {
  if (shelves.includes('currently-reading')) return 'currently-reading';
  if (shelves.includes('read')) return 'read';
  return 'to-read';
}

compileBooks = async () => {
  var books = [];
  var files = fs.readdirSync("src/books");
  for (let i in files) {
    let file = files[i];

    var contents = fs.readFileSync(`src/books/${file}`, "utf8");
    let data = fm(contents);

    let book = {
      meta: data.attributes,
      filename: file.replace(".md", ""),
      body: data.body,
    };

    let grData = await getBookData(book.meta.isbn).catch((error) => {
      console.error(error);
    });
    if (grData) {
      book.meta.title = book.meta.title || grData.book.title[0];
      book.meta.author = book.meta.author || grData.book.authors[0].author[0].name;
      book.meta.shelf = book.meta.shelf || getBookShelf(grData.shelves);
      let image_url = grData.book.image_url[0].replace(/\._.*_\./, ".");
      if (!image_url.includes("nophoto")) {
        book.meta.image_url =
          book.meta.image_url || grData.book.image_url[0].replace(/\._.*_\./, ".");
      }
    }
    books.push(book);
    
    let pugString = `
    \rextends ../layout
    \rappend variables
    \r  - var isBook = true
    \rblock content
    \r  div(id=meta.isbn).notes
    \r    h1: u= meta.title
    \r    h3: em By #{meta.author}
    \r    - var date = new Date(new Date().setHours(0,0,0,0))
    \r    if new Date(meta.updated) > date.setDate(date.getDate() - 30)
    \r      div.jump-to-latest
    \r        a.jump-to-latest-link(href='#latest').
    \r          #[span.notification-badge.notification-badge-left]
    \r          Jump to latest update
    \r    br
    \r    div.progress
    \r      div.progress-bar
    \r        span.progress-bar-percent
    \r      p.progress-value
    \r    if meta.image_url
    \r      center
    \r        img(src=meta.image_url alt=meta.title || 'image')
    \r    div.chapsums
    \r      :showdown
    \r        ${book.body.replace(/\n/g, "\n        ")}
    `;

    let html = pug.compile(pugString, {
      pretty: true,
      filters: pugFilters,
      filename: `src/pages/${book.filename}.pug`
    })(book);

    let filename = path.join(__dirname, `./dist/books/${book.filename}.html`);
    let bookDir = path.join(__dirname, "./dist/books");
    if (!fs.existsSync(bookDir)) {
      fs.mkdirSync(bookDir);
    }
    fs.writeFileSync(filename, html);
    console.log(`CREATE FILE: ${filename}`);
  }

  return { books: books };
}

compileBooks().then((books) => {
  var html = pug.compileFile(path.join(__dirname, "src/index.pug"), {
    pretty: true,
  })(books);

  fs.writeFile(path.join(__dirname, "./dist/index.html"), html, err => {
    if (err) return console.error(err);
    console.log("CREATE FILE: dist/index.html");
  });

  var sassSrc = path.join(__dirname, "src/styles/main.sass");
  sass.render(
    {
      file: sassSrc,
      outFile: "main.css",
    },
    (error, result) => {
      // node-style callback from v3.0.0 onwards
      if (!error) {
        // No errors during the compilation, write this result on the disk
        fs.writeFile(
          path.join(__dirname, "./dist/main.css"),
          result.css,
          err => {
            if (!err) {
              console.log("CREATE FILE: dist/main.css");
            }
          }
        );
      }
    }
  );
});
