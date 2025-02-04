// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
  var Backbone = require('backbone');
  var Helpers = require('core/helpers');
  var Origin = require('core/origin');
  var ArticleModel = require('core/models/articleModel');
  var EditorOriginView = require('../../global/views/editorOriginView');
  var EditorPageArticleView = require('./editorPageArticleView');
  var EditorPasteZoneView = require('../../global/views/editorPasteZoneView');

  var EditorPageView = EditorOriginView.extend({
    className: 'page',
    tagName: 'div',
    childrenRenderedCount: 0,
    events: _.extend({}, EditorOriginView.prototype.events, {
      'click .add-article': 'addNewArticle',
      'click .page-edit-button': 'openContextMenu',
      'dblclick .page-detail': 'loadPageEdit',
      'click .paste-cancel': 'onPasteCancel'
    }),

    preRender: function() {
      Origin.editor.blockCount = 0;
      
      this.listenTo(Origin, {
        'editorView:removeSubViews': this.remove,
        'pageView:itemAnimated': this.onChildRendered,
        'editorView:renderPage': this.render
      });
      Origin.options.addItems([
        {
          title: Origin.l10n.t('app.collapseAllArticles'),
          icon: 'minus',
          callbackEvent: 'editorView:collapseArticle:collapse',
          value: 'collapse',
          group: 'collapseArticle',
        },
        {
          title: Origin.l10n.t('app.expandAllArticles'),
          icon: 'plus',
          callbackEvent: 'editorView:collapseArticle:expand',
          value: 'expand',
          group: 'collapseArticle',
        }
      ]);

      this._onScroll = _.bind(_.throttle(this.onScroll, 400), this);
    },

    render: function() {
      Origin.editor.data.content.fetch({
        success: () => {
          var returnVal = EditorOriginView.prototype.render.apply(this, arguments);
          this.addArticleViews();
          return returnVal;
        },
        error: () => Origin.Notify.alert({ type: 'error', text: Origin.l10n.t('app.errorfetchingdata') })
      });
    },

    postRender: function() {
      this.setupScrollListener();
    },

    addArticleViews: function() {
      this.$('.page-articles').empty();
      Origin.trigger('editorPageView:removePageSubViews');
      // Insert the 'pre' paste zone for articles
      var prePasteArticle = new ArticleModel({
        _parentId: this.model.get('_id'),
        _type: 'article',
        _pasteZoneSortOrder: 1
      });
      this.$('.page-articles').append(new EditorPasteZoneView({ model: prePasteArticle }).$el);
      // Iterate over each article and add it to the page
      this.getChildren()
        .filter(c => c.get('_type') === 'article')
        .sort(Helpers.sortContentObjects)
        .forEach(c => this.addArticleView(c));
    },

    addArticleView: function(articleModel, scrollIntoView) {
      scrollIntoView = scrollIntoView || false;

      var newArticleView = new EditorPageArticleView({ model: articleModel });
      var sortOrder = articleModel.get('_sortOrder');
      var $articles = this.$('.page-articles .article');
      var index = sortOrder > 0 ? sortOrder-1 : undefined;
      var shouldAppend = index === undefined || index >= $articles.length || $articles.length === 0;

      if(shouldAppend) { // add to the end of the article
        this.$('.page-articles').append(newArticleView.$el);
      } else { // 'splice' block into the new position
        $($articles[index]).before(newArticleView.$el);
      }
      if (scrollIntoView) {
        $.scrollTo(newArticleView.$el, 200);
      }
      // Increment the 'sortOrder' property
      articleModel.set('_pasteZoneSortOrder', sortOrder + 1);
      // Post-article paste zone - sort order of placeholder will be one greater
      this.$('.page-articles').append(new EditorPasteZoneView({ model: articleModel }).$el);
      return newArticleView;
    },

    addNewArticle: function(event) {
      event && event.preventDefault();
      (new ArticleModel()).save({
        _parentId: this.model.get('_id'),
        _courseId: Origin.editor.data.course.get('_id'),
        _type: 'article'
      }, {
        success: model => {
          var articleView = this.addArticleView(model);
          articleView._skipRender = true; // prevent render of blocks in postRender
          articleView.addBlock();
        },
        error: () => Origin.Notify.alert({ type: 'error', text: Origin.l10n.t('app.erroraddingarticle') })
      });
    },

    loadPageEdit: function(event) {
      event && event.preventDefault();
       Origin.router.navigateTo(`editor/${this.model.get('_courseId')}/page/${this.model.get('_id')}/edit`);
    },

    // TODO fragile HACK, refactor context menu code to allow what I want to do later...
    openContextMenu: function(event) {
      if(!event) return console.log('Error: needs a current target to attach the menu to...');
      event.preventDefault();
      event.stopPropagation();

      var fakeModel = new Backbone.Model({ _id: this.model.get('_id'), _type: 'page-min' });
      var fakeView = new Backbone.View({ model: fakeModel });

      this.listenTo(fakeView, {
        'contextMenu:page-min:edit': this.loadPageEdit,
        'contextMenu:page-min:copyID': this.onCopyID
      });
      Origin.trigger('contextMenu:open', fakeView, event);
    },

    onCutArticle: function(view) {
      this.once('pageView:postRender', view.showPasteZones);
      this.render();
    },

    setupScrollListener: function() {
      $('.contentPane').on('scroll', this._onScroll);
    },

    onScroll: function(event) {
      Origin.editor.scrollTo = event.currentTarget.scrollTop;
    },

    removeScrollListener: function() {
      $('.contentPane').off('scroll', this._onScroll);
    },

    onChildRendered: function() {
      this.childrenRenderedCount++;

      if (this.childrenRenderedCount < Origin.editor.blockCount) {
        return;
      }
      if (Origin.editor.scrollTo > 0) {
        this.removeScrollListener();
      }
      $('.contentPane').scrollTo(Origin.editor.scrollTo, {
        duration: 200,
        onAfter: () => this.setupScrollListener()
      });
    },

    remove: function() {
      this.removeScrollListener();
      EditorOriginView.prototype.remove.apply(this, arguments);
    }
  }, {
    template: 'editorPage'
  });

  return EditorPageView;
});
