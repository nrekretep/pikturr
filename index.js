(function () {

    "use strict";

    const fs = require('fs')
    const SwaggerParser = require('swagger-parser')
    const swaggerParser = new SwaggerParser()
    const plantuml = require('node-plantuml')


    const internals = {}

    internals.plant_writeStartUml = function () {
        return '@startuml\n\n';
    }

    internals.plant_writeTitle = function (apiTree, pc) {
        return pc + 'title ' + apiTree.title + ' - Version ' + apiTree.version + '\n\n';
    }

    internals.plant_writeEndUml = function (pc) {
        return pc + '@enduml\n';
    }

    internals.plant_writeRessourceClasses = function (apiTree, pc) {

        var s = pc;
        var ressourceTree = apiTree;

        for (var r in ressourceTree.ressources) {
            if (ressourceTree.ressources.hasOwnProperty(r)) {
                s = internals.plant_writeRessourceClass(r, apiTree.title, ressourceTree.ressources[r], s);
            }
        }

        return s;

    }

    internals.plant_writeRessourceClass = function (ressource, parent, subRessources, pc) {
        var s = pc;
        s = s + 'class "' + ressource + '" <<ressource>> {\n';
        // add http_verbs as methods
        s = s + '__ http __\n';
        for (var v in subRessources.http_verbs) {

            if (!subRessources.http_verbs.hasOwnProperty(v)) continue;

            s = s + v + '(';
            for (var param in subRessources.http_verbs[v].params) {

                if (!subRessources.http_verbs[v].params.hasOwnProperty(param)) continue;

                s = s + param + ',';
            }
            if (s[s.length - 1] == ',') {
                s = s.slice(0, -1);
            }
            s = s + ')\n';
        }

        // end of class
        s = s + '}\n\n';
        s = s + '"' + parent + '" --> "' + ressource + '"\n\n';

        for (var r in subRessources) {
            if (r == 'http_verbs') continue;
            if (subRessources.hasOwnProperty(r)) {
                s = internals.plant_writeRessourceClass(r, ressource, subRessources[r], s);
            }
        }

        return s;
    }

    internals.plant_writeApiClass = function (apiTree, pc) {
        var s = pc;
        s = s + 'class "' + apiTree.title + '" <<api>>\n\n';
        return s;
    }

    /*
    Die relevanten Informationen werden aus der swagger API
    Struktur extrahiert und für die Transformation in die Ausgabeformate
    in eine Zwischenstruktur überführt.
     */
    internals.extractApiData = function (api, cb) {

        var valid_http_verbs = ['get', 'put', 'post', 'delete', 'head', 'options', 'patch'];
        var ressourceTree = {};
        ressourceTree.ressources = {};
        ressourceTree.title = api.info.title;
        ressourceTree.version = api.info.version;

        for (var p in api.paths) {
            if (api.paths.hasOwnProperty(p)) {
                // Pfadangabe muss mit Slash starten
                if (p[0] == '/') {

                    // Pfad in URI-Teile zerlegen
                    var pathSegments = p.split('/');
                    // Leere Elemente entfernen
                    pathSegments = pathSegments.filter(function (n) { return n != '' });

                    var root = ressourceTree.ressources;

                    for (var r in pathSegments) {
                        if (!pathSegments.hasOwnProperty(r)) continue;

                        var prop = pathSegments[r];
                        if (root[prop] == undefined) {
                            root[prop] = {};
                        }

                        root = root[prop];
                    }
                    root.http_verbs = {};

                    for (var v in valid_http_verbs) {

                        if (!valid_http_verbs.hasOwnProperty(v)) continue;

                        if (api.paths[p][valid_http_verbs[v]] != undefined) {
                            root.http_verbs[valid_http_verbs[v]] = {};
                            root.http_verbs[valid_http_verbs[v]].params = {};
                            for (var param in api.paths[p][valid_http_verbs[v]].parameters) {

                                if (!api.paths[p][valid_http_verbs[v]].parameters.hasOwnProperty(param)) continue;

                                root.http_verbs[valid_http_verbs[v]].params[api.paths[p][valid_http_verbs[v]].parameters[param].name] = {};
                            }
                        }
                    }
                }
            }
        }

        ressourceTree.definitions = {};
        for (var d in api.definitions) {
            if (!api.definitions.hasOwnProperty(d)) continue;

            ressourceTree.definitions[d] = {};
            for (p in api.definitions[d].properties) {

                if (!api.definitions[d].properties.hasOwnProperty(p)) continue;

                ressourceTree.definitions[d][p] = {};
            }
        }

        cb(ressourceTree);
    }

    internals.plant_writeRepresentationClasses = function (apiData, pc) {
        var s = pc;
        s = s + 'package Representations/Messages <<Folder>> {\n';
        for (var d in apiData.definitions) {
            s = s + 'class "' + d + '" <<representation>> { \n';
            s = s + '__properties__\n';
            for (var p in apiData.definitions[d]) {

                if (!apiData.definitions[d].hasOwnProperty(p)) continue;
                s = s + p + '\n';
            }
            s = s + '}\n';
        }

        s = s + "}\n\n";

        return s;
    }

    internals.plant_writeSkinParams = function (pc) {
        var s = pc;

        s = s + 'skinparam stereotypeCBackgroundColor<<representation>> DimGray\n';
        s = s + 'skinparam stereotypeCBackgroundColor<<api>> Red\n';
        s = s + 'skinparam stereotypeCBackgroundColor<<ressource>> SpringGreen\n';

        s = s + 'skinparam class {\n';
        s = s + 'BackgroundColor<<api>> Yellow\n';
        s = s + 'BackgroundColor<<representation>> Silver\n';
        s = s + 'BackgroundColor<<ressource>> YellowGreen\n';
        s = s + '}\n\n';

        return s;
    }

    internals.plant_writeLegend = function (apiTree, pc) {
        var s = pc;
        var d = new Date();
        d.setHours(d.getHours() + 2);
        s += 'legend left\n';
        s += 'created with pikturr (https://github.com/nrekretep/pikturr)\n';
        s += d.toISOString() + '\n';
        s += 'endlegend\n\n';

        return s;
    }

    internals.convertToPlantUml = function (apiData) {
        var s = internals.plant_writeStartUml();
        s = internals.plant_writeTitle(apiData, s);
        s = internals.plant_writeSkinParams(s);
        s = internals.plant_writeApiClass(apiData, s);
        s = internals.plant_writeRessourceClasses(apiData, s);
        s = internals.plant_writeRepresentationClasses(apiData, s);
        s = internals.plant_writeLegend(apiData, s);
        s = internals.plant_writeEndUml(s);

        var gen = plantuml.generate(s, { format: 'png' });
        gen.out.pipe(fs.createWriteStream('output-file.png'));
    }


    var pikturr = {};
    exports.generate = pikturr.generate = function (url) {
        swaggerParser.parse(url).then(function (api) {
            internals.extractApiData(api, internals.convertToPlantUml);
        }).catch(function (err) {
            console.log(err);
        })
    }

    if (!module.parent) {
        pikturr.generate(process.argv[2]);
    }

})();


