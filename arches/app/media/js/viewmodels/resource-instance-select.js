define([
    'knockout',
    'jquery',
    'viewmodels/widget',
    'arches',
], function(ko, $, WidgetViewModel, arches) {
    var nameLookup = {};
    require(['views/components/workflows/new-tile-step']);
    var ResourceInstanceSelectViewModel = function(params) {
        var self = this;
        params.configKeys = ['placeholder'];
        this.multiple = params.multiple || false;
        this.value = params.value || undefined;
        this.graphids = params.node ? ko.unwrap(params.node.config.graphid) : [params.graphid];
        this.graphids = this.graphids || [];
        this.graphNames = {};
        this.graphids.forEach(function(graphid){
            self.graphNames[graphid] = arches.resources.find(function(resource){
                return resource.graphid === graphid;
            });
        });

        this.useSemanticRelationships = arches.useSemanticRelationships;


        WidgetViewModel.apply(this, [params]);
        var displayName = ko.observable('');
        self.newTileStep = ko.observable();
        this.valueList = ko.computed(function() {
            var valueList = self.value();
            displayName();
            if (!self.multiple && valueList) {
                valueList = [valueList];
            }
            if (Array.isArray(valueList)) {
                return valueList;
            }
            return [];
        });
        this.displayValue = displayName;

        this.removeGraphIdsFromValue = function(value) {
            if (Array.isArray(value)) {
                self.graphids.forEach(function(graphid){
                    var graphindex = self.value().indexOf(graphid);
                    if (graphindex > -1) {
                        self.value().splice(graphindex, 1);
                    }
                });
                return ko.unwrap(value).length > 0 ? ko.unwrap(value) : null;
            } else if (self.graphids.indexOf(value) !== -1) {
                return null;
            } else {
                return value;
            }
        };

        this.close = function(){
            var cleanval = self.removeGraphIdsFromValue(this.value());
            this.value(cleanval);
            this.newTileStep(null);
        };

        this.valueObjects = ko.computed(function() {
            return self.valueList().map(function(value) {
                return {
                    id: value,
                    name: nameLookup[value],
                    reportUrl: arches.urls.resource_report + value
                };
            }).filter(function(item) {
                return item.name;
            });
        });

        var updateName = function() {
            var names = [];
            self.valueList().forEach(function(val) {
                if (val) {
                    if (nameLookup[val]) {
                        names.push(nameLookup[val]);
                        displayName(names.join(', '));
                    } else {
                        $.ajax(arches.urls.resource_descriptors + val, {
                            dataType: "json"
                        }).done(function(data) {
                            nameLookup[val] = data.displayname;
                            names.push(data.displayname);
                            displayName(names.join(', '));
                        });
                    }
                }
            });
        };

        updateName();

        var relatedResourceModels = ko.computed(function() {
            var res = [];
            if (params.node) {
                var ids = ko.unwrap(params.node.config.graphid);
                if (ids) {
                    res = arches.resources.filter(function(graph) {
                        return ids.indexOf(graph.graphid) >= 0;
                    }).map(function(g) {
                        return {
                            name: g.name,
                            _id: g.graphid,
                            isGraph: true
                        };
                    });
                }
            }
            return res;
        }, this);


        var url = ko.observable(arches.urls.search_results);
        this.url = url;
        this.select2Config = {
            value: this.selectedResource,
            clickBubble: true,
            multiple: this.multiple,
            placeholder: this.placeholder,
            closeOnSelect: false,
            allowClear: true,
            onSelect: function(item) {
                if (item._source) {
                    var ret = {
                        "resource": {
                            "id": item._id,
                            "name": item._source.displayname
                        },
                        "ontologyproperty": "p44_test",
                        "revProperty": "p44i_from_test",
                        "ontologyclass": item._source.root_ontology_class
                    };
                    if (self.multiple) {
                        ret = [ret];
                        if (self.value() !== null) {
                            ret = ret.concat(self.value());
                        }
                    }
                    self.value(ret);
                } else {
                    return '<b> Create a new ' + item.name + ' . . . </b>';
                }
            },
            ajax: {
                url: function() {
                    return url();
                },
                dataType: 'json',
                quietMillis: 250,
                data: function(term, page) {
                    //TODO This regex isn't working, but it would nice fix it so that we can do more robust url checking
                    // var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
                    // var regex = new RegExp(expression);
                    // var isUrl = val.target.value.match(regex)
                    var isUrl = term.startsWith('http');
                    if (isUrl) {
                        url(term.replace('search', 'search/resources'));
                        return {};
                    } else {
                        url(arches.urls.search_results);
                        var graphid = params.node ? ko.unwrap(params.node.config.graphid) : undefined;
                        if(!!params.graphid) { graphid = [ko.unwrap(params.graphid)]; }
                        var data = { 'paging-filter': page };
                        if (graphid && graphid.length > 0) {
                            data['resource-type-filter'] = JSON.stringify(
                                graphid.map(function(id) {
                                    return {
                                        "graphid": id,
                                        "inverted": false
                                    };
                                })
                            );
                        }
                        if (term) {
                            data['term-filter'] = JSON.stringify([{
                                "inverted": false,
                                "type": "string",
                                "context": "",
                                "context_label": "",
                                "id": term,
                                "text": term,
                                "value": term
                            }]);
                        }
                        return data;
                    }
                },

                results: function(data, page) {
                    if (!data['paging-filter'].paginator.has_next) {
                        if (relatedResourceModels()) {
                            relatedResourceModels().forEach(function(val) {
                                data.results.hits.hits.push(val);
                            });
                        }
                    }
                    return {
                        results: data.results.hits.hits,
                        more: data['paging-filter'].paginator.has_next
                    };
                }
            },
            id: function(item) {
                return item._id;
            },
            formatResult: function(item) {
                if (item._source) {
                    return item._source.displayname;
                } else {
                    return '<b> Create a new ' + item.name + ' . . . </b>';
                }
            },
            formatSelection: function(item) {
                if (item._source) {
                    return item._source.displayname;
                } else {
                    return item.name;
                }
            }
        };
    };

    return ResourceInstanceSelectViewModel;
});
