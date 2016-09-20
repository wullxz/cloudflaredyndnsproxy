<% include _head %>
<body class="container">
  <div class="row header">
    <% include _header %>
  </div>

  <h1><% if (typeof title !== 'undefined') { %><%= title %><% } %></h1>
  <%- msgs() %>

  <%
    // Preset Variables for form
  if (locals.moduser) {
    var name = moduser.name;
    var email = moduser.email;
    var maxdomains = moduser.maxDomains;
    var superAdmin = moduser.superAdmin;
  } else {
    var name = "";
    var email = "";
    var maxdomains = "";
    var superAdmin = false;
  }

%>

<div class="row addform">
  <div class="col-sm-6 col-sm-offset-3">
    <!-- LOGIN FORM -->
    <form action="/admin/moduser" method="post">
      <div class="form-group">
        <label>Email</label>
        <input type="text" class="form-control" name="email" value="<%= email %>">
      </div>
      <div class="form-group">
        <label>Name</label>
        <input type="text" class="form-control" name="name" value="<%= name %>">
      </div>
      <% if (id == user._id) { %>
        <div class="form-group">
          <label>Old password</label>
          <input type="password" class="form-control" name="oldpassword">
        </div>
      <% } %>
      <div class="form-group">
        <label>Password</label>
        <input type="password" class="form-control" name="password">
      </div>
      <div class="form-group">
        <label>Password confirm</label>
        <input type="password" class="form-control" name="passwordconfirm">
      </div>
      <% if (user.superAdmin) { %>
        <div class="form-group">
          <label>Maximum of DynDNS Domains</label>
          <input type="number" id="maxdomains" min="0" step="1" value="<%= maxdomains %>"
          data-bind="value:maxdomains" class="form-control" name="maxdomains">
        </div>
        <div class="form-group checkbox">
          <label>
            <input type="checkbox" name="superAdmin" value="superAdmin" <% if (superAdmin) { %>checked<% } %>> Super admin
          </label>
        </div>
      <% } %>

      <% if (id) { %>
        <input type="hidden" name="id" value="<%= id %>" />
      <% } %>
      <button type="submit" class="btn btn-normal btn-lg">Save</button>
    </form>
  </div>
</div>

</body>