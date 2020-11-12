var t;
function backToTop() {

  clearTimeout(t);

  if ($(document).scrollTop() > 250) {
    $('#back-to-top').css({
      'bottom': '2rem'
    });

    t = setTimeout(function () {
      $('#back-to-top').css({
        'bottom': '-4rem'
      });
    }, 2000);
  }
  if ($(document).scrollTop() < 20) {
    $('#back-to-top').css({
      'bottom': '-4rem'
    });
  }

}

$(function() {

  let chapters = $('.task-list-item > input').toArray();

  if (chapters.length > 0) {
    chapters.forEach( (c) => {
      $(c).removeAttr('disabled');
    });

    let finishedChapters = chapters.filter ( c => { return $(c).prop('checked') });
    let percentDone = Math.round( ( ( finishedChapters.length / chapters.length  ) * 100 ) * 10 ) / 10;

    $('.progress-value').html( `${Math.round(percentDone)}% read` );
    $('.progress-bar-percent, .progress-value').width( `${percentDone}%` );
  }

  backToTop();
  $('#back-to-top').click(function() {
    // $(document).scrollTop(0);
    $('html, body').animate({ scrollTop: 0 }, 'slow');
  });

  $(document).scroll(function () {
    backToTop();
  });

});
