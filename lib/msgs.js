module.exports = function (req, res) {
  return function () {
    var flash = req.flash();
    var types = Object.keys(flash);
    var output = '';
    var classes = {
      info: "alert-info",
      success: "alert-success",
      warning: "alert-warning",
      error: "alert-danger"
    }


    if (types.length) {
      var buf = [];
      buf.push('<div id="row messages">');
      types.forEach(function (type) {
        var ms = flash[type];
        if (ms) {
          buf.push('  <div class="alert ' + classes[type] + '">');
          ms.forEach(function (m) {
            buf.push('    <span>' + m + '</span><br />');
          });
          buf.push('  </div>');
        }
      });
      buf.push('</div>');
      output = buf.join('\n');
    }

    return output;
  }
}
