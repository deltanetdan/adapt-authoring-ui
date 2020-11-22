// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(['require', 'backbone'], function(require, Backbone) {
  var SessionModel = Backbone.Model.extend({
    url: "api/auth/check",

    initialize: function(Origin) {
      this.Origin = Origin;

      this.on('sync', () => this.set('isAuthenticated', true));
      this.on('error', () => this.set('isAuthenticated', false));
    },

    hasScopes: function(scopes) {
      var assignedScopes = this.get('scopes');
      if(this.get('isSuper')) {
        return true;
      }
      if(!assignedScopes || !assignedScopes.length) {
        return false;
      }
      if(!Array.isArray(scopes)) {
        return assignedScopes.includes(scopes);
      }
      return scopes.every(s => assignedScopes.includes(s));
    },

    login: function (email, password, shouldPersist) {
      $.post('api/auth/local', { email, password })
      .done(() => {
        this.fetch({ 
          success: () => {
            this.Origin.trigger('login:changed');
            this.once('sync', () => this.Origin.router.navigateToHome())
          },
          error: ({ status }) => this.Origin.trigger('login:failed', status)
        });
      })
      .fail(({ status }) => this.Origin.trigger('login:failed', status));
    },
    
    logout: function () {
      $.post('api/auth/disavow', () => {
        // revert to the defaults
        this.set(this.defaults);
        this.Origin.trigger('login:changed');
        this.Origin.router.navigateToLogin();
      });
    }
  });

  return SessionModel;
});
