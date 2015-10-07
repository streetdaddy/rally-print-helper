/**
 * Boost Rally Print Helper
 * Boost New Media
 * Contributors:
 * - Benedict Aluan
 * - Joe Auslander
 */

/** --------------------------------------------------------------------
 *  Boost.rally.PrintGrid
 *  Custom component encapsulate all print helper grid functions
 *  --------------------------------------------------------------------
 */

Ext.define('Boost.rally.PrintGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.printgrid',
    title: 'Print Grid',
    remoteHost: 'rally1.rallydev.com',
    columnLines: true,
    border: false,
    emptyText: 'No records found',
    hideIteration: false,
    styleSheetPath: 'print.css',
    printTitle: 'Work Item Printer',
    remote: false,
    initComponent: function() {
        var self = this,
            config = {};

        self._setRemote();
        self._buildColumns(config);
        self._buildSelectionModel(config);
        self._buildTbar(config);

        Ext.apply(this, config);
        this.callParent(arguments);
    },

    _setRemote: (function() {
        var self = this,
            url = window.location.origin;

        if (url.indexOf(this.remoteHost) >= 0) {
            self.remote = true;
        }
    }),

    _buildColumns: (function(config) {
        config.columns = [{
            xtype: 'rownumberer'
        }, {
            text: 'ID',
            dataIndex: 'FormattedID',
            flex: 1,
            sortable: false
        }, {
            text: 'Work Item Name',
            dataIndex: 'Name',
            flex: 3,
            sortable: false
        }];
    }),

    _buildSelectionModel: (function(config) {
        var self = this;

        config.selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: 'MULTI',
            allowDeselect: true,
            listeners: {
                scope: self,
                selectionchange: self._selectRecord
            }
        });
    }),
    
    _buildTbar: (function(config) {
        var self = this,
            items = [];

        var printBtn = Ext.create('Ext.button.Button', {
            text: 'Print',
            handler: self._printOptions,
            scope: self,
            disabled: true
        });

        self.printBtn = printBtn;

        if (self.hideIteration) {
            items = ['->', printBtn];
        }
        else {
            var store = Ext.create('Rally.data.WsapiDataStore', {
                model: 'Iteration',
                fetch: true,
                sorters: [{
                    property: 'EndDate',
                    direction: 'DESC'
                }]
            });

            var iterationBox = Ext.create('Ext.form.field.ComboBox', {
                store: store,
                displayField: 'Name',
                valueField: 'ObjectID',
                triggerAction: 'all',
                listeners: {
                    scope: self,
                    change: self._iterationCallback
                }
            });

            store.on('load', function(st) {
                iterationBox.setValue(st.getAt(0).get('ObjectID'));
            });

            store.load();

            items = [iterationBox, '->', printBtn];
        }

        config.tbar = items;
    }),
    
    _printOptions: (function() {
        var self = this;

        var fieldsForm = Ext.create('Ext.FormPanel', {
            fieldDefaults: {
                labelWidth: 100
            },
            defaultType: 'checkbox',
            width: 400,
            bodyPadding: 10,
            items: [{
                boxLabel: 'ID',
                name: 'iteration-id',
                inputValue: 'iteration-id',
                checked: true
            }, {
                boxLabel: 'Owner',
                name: 'iteration-owner',
                inputValue: 'iteration-owner',
                checked: true
            }, {
                boxLabel: 'Name',
                name: 'iteration-name',
                inputValue: 'iteration-name',
                checked: true
            }, {
                boxLabel: 'Description',
                name: 'iteration-description',
                inputValue: 'iteration-description',
                checked: true
            }, {
                boxLabel: 'Estimate',
                name: 'iteration-estimate',
                inputValue: 'iteration-estimate',
                checked: true
            }, {
                boxLabel: 'Rank',
                name: 'iteration-rank',
                inputValue: 'iteration-rank',
                checked: true
            }],
            tbar: ['->', {
                text: 'Print',
                handler: self._printIteration,
                scope: self
            }]
        });
        
        var fieldsWindow = Ext.create('widget.window', {
            title: 'Print options',
            layout: 'fit',
            closable: true,
            modal: true,
            resizable: false,
            items: [fieldsForm]
        });

        self.fieldsForm = fieldsForm;
        fieldsWindow.show();
    }),
    
    _printIteration: (function(cb) {
        var self = this,
            selections = self.getSelectionModel().getSelection();

        if (selections.length > 0) {
            self._buildTemplate(selections);
        }
    }),
    
    _buildTemplate: (function(selections) {
        var self = this,
            data = self._sanitizeData(selections),
            fieldsForm = self.fieldsForm,
            formValues = fieldsForm.getValues();

        var tpl = new Ext.XTemplate(
            '<tpl for="artifacts">',
            '<div class="artifact">',
            '<div class="ratio-control">',
            '<div class="card-frame">',
            '<div class="header {type}">',
            '<span class="storyID {[this.hideElements(\'id\')]}">{id}</span>',
            '<span class="ownerText {[this.hideElements(\'owner\')]}">{owner}</span>',
            '</div>',
            '<tpl if="this.hideElements(estimate)">',
            '<div class="estimate {[this.hideElements(\'estimate\')]} {type}">{estimate}</div>',
            '</tpl>',
            '<div class="content">',
            '<div class="card-title {[this.hideElements(\'name\')]}">{name}</div>',
            '<div class="description {[this.hideElements(\'description\')]}">{description}</div>',
            '</div>',
            '<span class="rank {[this.hideElements(\'rank\')]}">#{#}</span>',
            '</div>',
            '</div>',
            '</div>',
            '<div class="{defineBreak}"></div>',
            '</tpl>', {
                compiled: true,
                hideElements: (function(element, field) {
                    return formValues['iteration-' + element] ? '' : 'hidden';
                })
            }
        );

        var markup = tpl.apply(data);
        self._printCards(markup);
    }),
    
    _selectRecord: (function(selModel) {
        var self = this;

        selModel.hasSelection() ? self.printBtn.enable() : self.printBtn.disable();
    }),
    
    _sanitizeData: (function(selections) {
        var self = this;
        data = {
            artifacts: []
        };

        Ext.Array.each(selections, function(selection) {
            var obj = {
                name: selection.get('Name'),
                description: selection.get('Description'),
                id: selection.get('FormattedID'),
                type: selection.get('_type')
            };
            
            if (selection.get('PlanEstimate')) {
                obj['estimate'] = selection.get('PlanEstimate');
            }

            if (selection.get('Owner')) {
                obj['owner'] = selection.get('Owner')['_refObjectName'];
            }
            
            data.artifacts.push(obj);
        });

        return data;
    }),
    
    _iterationCallback: (function(cmb, recordId, oldVal, opts) {
        var self = this,
            store = self.getStore();

        var filters = [{
            property: 'Iteration',
            operator: '=',
            value: '/iteration/' + recordId
        }];

        store.reload({
            filters: filters
        });

        store.filter(filters);
    }),
    
    _printCards: (function(markup) {
        var self = this,
            options = 'toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500',
            win = window.open('', self.printTitle, options),
            // win = window.open('', '_blank', options),
            doc = win.document;

        doc.write('<html><head><title>' + self.printTitle + '</title>');

        if (self.remote) {
            doc.write('<link href="https://cdn.rawgit.com/streetdaddy/rally-print-helper/master/print.css" rel="stylesheet" type="text/css" media="screen,print" />');
        }
        else {
            doc.write('<link href="' + self.styleSheetPath + '?' + Date.now() + '" rel="stylesheet" type="text/css" media="screen,print" />');
        }

        doc.write('</head><body class="landscape">');
        doc.write(markup);
        doc.write('</body></html>');
        doc.close();

        win.focus();
        win.print();
        return false;
    })
});

/** --------------------------------------------------------------------
 *  CustomApp
 *  Builds the layout
 *  --------------------------------------------------------------------
 */

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    printTitle: 'Work Item Printer',
    launch: function() {
        var self = this;

        self._buildTabs();
    },
    
    _buildTabs: (function() {
        var self = this;

        // User stories
        var userStoriesGrid = Ext.create('Boost.rally.PrintGrid', {
            store: Ext.create('Rally.data.WsapiDataStore', {
                model: 'User Story',
                autoLoad: false,
                sorters: [{
                    property: 'Rank',
                    direction: 'ASC'
                }]
            }),
            title: 'User Stories'
        });

        // Defects
        var defectsGrid = Ext.create('Boost.rally.PrintGrid', {
            store: Ext.create('Rally.data.WsapiDataStore', {
                model: 'Defect',
                autoLoad: false,
                sorters: [{
                    property: 'Rank',
                    direction: 'ASC'
                }]
            }),
            title: 'Defects'
        });

        // Backlog
        var backlogStore = Ext.create('Rally.data.WsapiArtifactStore', {
            models: ['Defect', 'UserStory'],
            autoLoad: false,
            sorters: [{
                property: 'Rank',
                direction: 'ASC'
            }]
        });

        var filters = [{
            property: 'Release',
            operator: '=',
            value: 'null'
        }, {
            property: 'Iteration',
            operator: '=',
            value: 'null'
        }];

        backlogStore.filter(filters);

        var backlogGrid = Ext.create('Boost.rally.PrintGrid', {
            store: backlogStore,
            hideIteration: true,
            title: 'Backlog'
        });

        var tab = Ext.create('Ext.tab.Panel', {
            activeTab: 0,
            border: false,
            items: [userStoriesGrid, defectsGrid, backlogGrid]
        });

        self.add(tab);
    })
});
