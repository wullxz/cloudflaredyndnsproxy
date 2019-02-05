(function () {
  $('.domainip').each(function (index, item) {
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

  $('button[data-domain]').each(function (index, btn) {
    $(btn).on('click', function (event) {
      var domain = $(btn).attr('data-domain');
      var data = {
        domain: domain
      };

      $.post('/ddns/delete/', data)
        .done(function (result) {
          if (result.success) {
            //$('tr[data-domain="'+domain+'"]').remove();
          }
        })
        .fail(function (err) {
          console.log("Could not delete domain " + domain);
        });
    });
  });
})()
