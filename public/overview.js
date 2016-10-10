(function () {
  $('.domainip').each(function (index, item) {
    console.log(item);
    console.log(JSON.stringify(item));
    var domain = $(item).attr('data-domain');
    $.get('/ddns/get/'+domain)
      .done(function (data) {
        console.log("Query of domain successful:\n" + JSON.stringify(data, null, 2));
        $(item).html(data.content);
      })
      .fail(function (err) {
        console.log("Query of domain " + domain + " not successful:\n" + JSON.stringify(err, null, 2));
        $(item).html("---");
      });
  });
})()
