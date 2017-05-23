{Disposable, CompositeDisposable} = require 'atom'
{$$, View} = require 'atom-space-pen-views'
path = require 'path'
config = require '../lib/config'

module.exports =
class ErrorConsoleView extends View
  @content: ->
    @div class: 'error-console', =>
      @div class: 'panel-heading padded', =>
        @span 'Error Console: '
        @span outlet: 'errorHeaderText', 'No error listed'
      @div outlet: 'backtrace', class: 'panel-body padded'

  initialize: ->
    @on 'click', '.backtracePath', ({target}) => @openErrorFiles(target.innerText)

  serialize: ->
    attached: @panel?.isVisible()

  destroy: ->
    @detach()

  toggle: ->
    if @panel?.isVisible()
      @detach()
    else
      @attach()

  show: ->
    if !@panel?.isVisible()
      @attach()

  attach: ->
    @disposables = new CompositeDisposable

    @panel = atom.workspace.addBottomPanel(item: this)
    @disposables.add new Disposable =>
      @panel.destroy()
      @panel = null

  detach: ->
    @disposables?.dispose()

  update: (error) ->

    @errorHeaderText.html $$ ->
      @span class: 'error-header-text', error.text

    @backtrace.html $$ ->
      @table class: 'table-condensed', =>
        if error.error
          @tr class: 'errorRow', =>
            @td class: 'backtracePath', error.error.localPath + ' Line: ' + error.error.line
            # @td class: 'line', error.error.line

        for backtrace in error.backtrace
          @tr class: 'backtraceRow', =>
            @td class: 'backtracePath', backtrace.localPath + ' Line: ' + backtrace.line
            # @td class: 'line', backtrace.line

  openErrorFiles: (backtrace) ->

    if backtrace.indexOf('Missing local path for') >= 0
      return

    @bt = backtrace.split(' Line: ');
    # Pull of the file directory and
    @filePath = path.join(config.getItem('linkedProjectRoot'), @bt.shift());
    @line = parseInt(@bt.shift()) - 1;

    atom.workspace.open(@filePath, {
        initialLine: @line,
        pending: true
    });
