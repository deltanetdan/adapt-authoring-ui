// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {
	var Origin = require('core/origin');

	var separators = ["/", ":"];
	var routes = [];

	var Permissions = {
		/**
		 * This method should return true or false based upon if the user has the correct permissions
		 * @param {*} permissionsArray 
		 */
		hasPermissions: function(permissionsArray) {
			// First check for any wildcards '*'
			var sessionModelPermissions = Origin.sessionModel.get('permissions');
			var hasWildCard = false;
			var tenantWildCards = [];
			_.each(sessionModelPermissions, function(permission) {
				// Find out if the first character is a wild card
				if (permission.charAt(0) === '*') {
					hasWildCard = true;
					return;
				}
				// Find out if theres any {{tenantid}}/*
				var splitPermission = splitString(permission)
				
				if (splitPermission[1].charAt(0) === '*') {
					var tenantWildCard = splitPermission[splitPermission.length - 1];
					tenantWildCards.push(tenantWildCard);
				}
			});
			// If the user has the ultimate wildcard just return true
			if (hasWildCard) {
				return true;
			}
			// These are used to compare the permissions length coming in and the allowed permissions
			var permissionsLength = permissionsArray.length;
			var allowedPermissionsLength = 0;

			_.each(permissionsArray, function(permissionItem) {
				var splitPermissionItem = splitString(permissionItem);
				// Check if the user has a tenantWildCard matching the operation - :create || :retrieve etc
				if (_.contains(tenantWildCards, splitPermissionItem[splitPermissionItem.length-1])) {
					allowedPermissionsLength++;
					return;
				}
				// Check if the user has a match (currently a straight string comparision)
				if (_.contains(sessionModelPermissions, permissionItem)) {
					allowedPermissionsLength++;
				}
			});
			// If the all the permissions coming in match the allowed length then allow this user the permission
			return allowedPermissionsLength === permissionsLength;
		},

		addRoute: function(route, permissions) {
			if (!_.isString(route) || !_.isArray(permissions)) {
				return console.log('Please consult the documentation on adding permissions to a route');
			}
			// Push the route and permissions to the routes array
			routes.push({ route: route, permissions: permissions });
		},

		checkRoute: function(route) {
			// Find the route
			var routeObject = _.findWhere(routes, {route: route});
			// If no route is avialable the pass back true
			if (!routeObject) return true;
			// If there is a route - check against the users permissions
			return this.hasPermissions(routeObject.permissions);
		}
	};

	function splitString(string) {
		return string.split(new RegExp(separators.join('|'), 'g'));
	}

	Origin.permissions = Permissions;
});