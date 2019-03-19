var $ = require('jquery');
var printMenu = require('./printmenu');
var config = require('../../conf/origoConfig');
var ol = require('openlayers');
var viewer = require('../viewer');
var utils = require('./utils/utils');

/**
 * Converts values passed from gui to an object accepted by mapfish
 * @param {Object} options 
 */
function convertToMapfishOptions(options) {
	var dpi = parseInt(options.dpi.split(' ')[0]);
	var scale = parseInt(options.scale.split(/[: ]/).pop());
	var layers = options.layers;
	var units = viewer.getProjection().getUnits();
	var mapfishOptions = {
		layout: options.layout,
		srs: viewer.getProjection().getCode(),
		units: viewer.getProjection().getUnits(), //TODO: Kolla upp om detta stämmer
		outputFilename: "kartutskrift",
		outputFormat: options.outputFormat,
		mapTitle: options.title,
		layers: [],
		pages: [{
			comment: "",
			mapTitle: options.title,
			center: options.center,
			scale: options.scale,
			dpi: options.dpi,
			geodetic: false
		}],
		legends:[{
			classes: [],
			name: ""
		}]
	};

    //get name of background map
    var backgroundLayer = layers.filter(function(layer) {
        return layer.get('group') === "background";
	})[0];
	
    //assemble object to be pushed to layers. backgroundLayer will always contain 1 element
	if(backgroundLayer) {
		var url;
		if (backgroundLayer.getSource() instanceof ol.source.TileWMS) {
            url = fetchSourceUrl(backgroundLayer)
		} else if (backgroundLayer.getSource() instanceof ol.source.ImageWMS) {
            url = fetchSourceUrl(backgroundLayer)
		} else {
			console.log('Bakgrundslager är av okänd bildtyp: ', backgroundLayer.getSource);
		}
		var backgroundLayerObject = {
			type: backgroundLayer.get('type'),
			baseURL: url,
			format: backgroundLayer.getSource().getParams().FORMAT,
			layers: [backgroundLayer.getSource().getParams().LAYERS]
		};
		mapfishOptions.layers.push(backgroundLayerObject);
	} else {
		//tom
	}

    //filter background map from remaining layers.
    layers = layers.filter(function(layer) {
        return layer.get('group') !== "background" && typeof layer.get('name') !== 'undefined';
	});

	// build legend objects and add to mapfishconfig
	var legendArray = buildLegend(layers.filter(function(layer) {return (layer.get('name').indexOf("_bk_") == -1) } )); //TODO: Make it more user configurable

	legendArray.forEach(function(obj) {
		if(obj) mapfishOptions.legends[0].classes.push(obj);
	});
	
	//return Object[] filtered by baseURL and/or type
    var wmsLayers = buildLayersObjects(layers.filter(function(layer) { return typeof layer.get('name') != "undefined" }), "WMS");
    var wfsLayers = buildLayersObjects(layers.filter(function(layer) { return typeof layer.get('name') != "undefined" }), "WFS");

    if (wmsLayers.length !== 0) {
        wmsLayers.forEach(function(layer) {
            mapfishOptions.layers.push(layer);
        });
    }
    if (wfsLayers.length !== 0) {
        wfsLayers.forEach(function(layer) {
            mapfishOptions.layers.push(layer);
        });
	}
	return mapfishOptions;
}

function buildLegend(layers) {
	var themeLayers = [];
	var legendObjects = layers.reduce(function(result, layer) {
		const type = layer.get('type') || "";
        switch (type.toUpperCase()) {
			case "WMS":
				var o = [];
				var url = fetchSourceUrl(layer);
				var name = layer.get('name');
				//special case for theme layers
				if(layer.get('theme') == true || layer.get('ArcGIStheme') == true){
					themeLayers.push({
						sublayers : layer.get('sublayers'),
						title : layer.get('title'),
						name : layer.get('name'),
						theme : layer.get('theme'),
						ArcGIStheme : layer.get('ArcGIStheme'),
						url : url
					})
				}
				//special case for grouped layers
				else if(layer.get('grouplayer') == true){
					var sublayers = layer.get('sublayers');
					for(var i = 0; i < sublayers.length; i++){
						//theme layers might be in grouped layers
						if(sublayers[i].theme == true || sublayers[i].ArcGIStheme == true) {
							if (!sublayers[i].url) 
								sublayers[i].url = url;
							themeLayers.push(sublayers[i]);
						}
						else{
							var subName = sublayers[i].title;
							var rule = sublayers[i].rule;
							var style = sublayers[i].style;
							var layername = sublayers[i].name;
							result.push({
								name : subName, 
								icons: [url + '/?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=' + layername + '&STYLE=' + style +'&RULE='+ rule +'&SCALE=1&legend_options=dpi:400'] 
							})
						}
					}
				}
				//normal case, single layer
				else{
					result.push({
						name: layer.get('title'),
						icons: [url + '/?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=' + name +'&SCALE=1&legend_options=dpi:400']
					})
				}
				return result;
            break;
			case "WFS":
				var o = [];
				var url = fetchSourceUrl(layer);
				var name = layer.get('name');
				result.push({
					name: layer.get('title'),
					icons: [ url + '/?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=' + name +'&SCALE=1&legend_options=dpi:400']
				})
				return result;
            break;
        }
	},[]);

	//handle the cases for themelayers and add to same array as the rest of the layers
	//handle after to make sure any single layers is added before every theme layer
	themeLayers.forEach(function (layer, index) {
		var sublayers = layer.sublayers;
		var url = layer.url;
		var name = layer.name;
		//newline for some separation between theme layers
		legendObjects.push({ name : "\n"+layer.title });
		if(layer.theme == true){
			for(var i = 0; i < sublayers.length; i++){
				var subName = sublayers[i].title;
				var rule = sublayers[i].rule;
				//handle if another style is specified
				var url = layer.style ? 
					layer.url + '/?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=' + name + '&STYLE=' + layer.style +'&RULE='+ rule +'&SCALE=1&legend_options=dpi:400'
					: layer.url + '/?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=' + name +'&RULE='+ rule +'&SCALE=1&legend_options=dpi:400'
				legendObjects.push({
					name : subName, 
					icons: [url] 
				});
			};
		}	
		else if(layer.ArcGIStheme == true){
			for(var i = 0; i < sublayers.length; i++){
				var subName = sublayers[i].title;
				var subUrl = sublayers[i].url;
				legendObjects.push({
					name : subName, 
					icons: [subUrl] 
				});
			}
		}
	});
	
    return legendObjects;
}

// All urls should point to wms service, regardless if layer type is wfs
function fetchSourceUrl(layer) {
	switch (layer.get('type').toUpperCase()) {
		case "WMS":
			if (layer.getSource() instanceof ol.source.TileWMS) {
				url = layer.getSource().getUrls()[0]; 
			} else if (layer.getSource() instanceof ol.source.ImageWMS) {
				url = layer.getSource().getUrl(); 
			}
            if (url.charAt(0) == "/") {
                url=config.localHost+url
            }
			return url;
		break;
		case "WFS":
			var fullUrl = viewer.getSettings().source[layer.get('sourceName')].url;
			var parsed = fullUrl.split('/');
			var result = parsed[0] + '//' + parsed[2];
			return result + '/geoserver/wms';
		break;
	}
	// return viewer.getSettings().source[sourceName].url;
	
}

/**
 * 
 * @param {(Object[])} layers 
 */
function buildLayersObjects(inLayers, type) {
	//WFS style defaults
	var fillColor = "#FC345C"
	,   fillOpacity = 0.5
	,   strokeColor = "#FC345C"
	,   strokeOpacity = 1
	,   strokeWidth = 3
	,   strokeLinecap = "round"
	,   strokeDashstyle = "solid"
	,   pointRadius = 10
	,   pointFillColor = "#FC345C"
	,   externalGraphic = ""
	,	graphicOpacity = 1
	,   labelAlign = "cm"
	,   labelOutlineColor = "white"
	,   labelOutlineWidth = 3
	,   fontSize = "16"
	,   fontColor = "#FFFFFF"
	,   fontBackColor = "#000000";

	//Filter layers by type
	var layers = inLayers.filter(function (layer) {
		return layer.get("type") === type;
	});

	var printableLayers = [];
	var printIndex = null;
	switch(type) {
		case 'WMS':
		var url;
		//Build wms objects one per source
		layers.forEach(function(layer) {
			if (layer.getSource() instanceof ol.source.TileWMS) {
                url = fetchSourceUrl(layer)
			} else if (layer.getSource() instanceof ol.source.ImageWMS) {
				url = fetchSourceUrl(layer)
			} else {
				console.log('Lagertyp stöds ej.');
			}
			printIndex = printableLayers.findIndex(function(l) { return l.baseURL === url });
			if (printIndex !== -1) {
				printableLayers[printIndex].layers.push(layer.get('name'));
			} else {
				printableLayers.push({
					type: layer.get('type'),
					baseURL: url,
					format: layer.getSource().getParams().FORMAT,
					layers: [layer.getSource().getParams().LAYERS],
                    opacity: layer.get('opacity')
				});
			}
		});
		break;
		case 'WFS':
			layers.forEach(function(layer) {
				var projectionCode = viewer.getProjection().getCode();
				var styleName = layer.get('styleName');

				// Ändra på defaultvärden beroende på vad som finns i index.json (styleSettings);
				modifyDefaultStyles(viewer.getStyleSettings()[styleName]);

				var geojson  = new ol.format.GeoJSON();
				var source = layer.getSource();
				var features = source.getFeatures();
				var type = layer.get('type');

				features.forEach(function(feature) {
					feature.setProperties({'_gx_style': 0});
				});

				var data = geojson.writeFeatures(features, {featureProjection: projectionCode, dataProjection: projectionCode});
				printableLayers.push({
					type: 'vector',
					geoJson: JSON.parse(data),
					name: layer.get('name'),
					version: "1",
					styleProperty: "_gx_style",
					styles: {0: {
						fillColor: fillColor,
						fillOpacity: fillOpacity,
						strokeColor: strokeColor,
						strokeWidth: strokeWidth,
						pointRadius: pointRadius,
						pointFillColor: pointFillColor,
						externalGraphic: externalGraphic,
						graphicOpacity: graphicOpacity,
						labelAlign: labelAlign,
						labelOutlineColor: labelOutlineColor,
						labelOutlineWidth: labelOutlineWidth,
						fontSize: fontSize,
						fontColor: fontColor,
						fontBackColor: fontBackColor
					}}
				});
			});
		break;
	}
	
	function modifyDefaultStyles(styles) {
		//based on index.json styles being defined as [[]]
		styles.forEach(function(s) {
			s.forEach(function(f) {
				// Set fill properties if fill exists
				if (f.hasOwnProperty('fill')) {
					if (f.fill.hasOwnProperty('color')) {
						fillColor = utils.rgbaToHex(f.fill.color).toUpperCase();
					}
					if (f.fill.hasOwnProperty('opacity')) {
						fillOpacity = f.fill.opacity;
					}
				}
				// Set stroke properties if stroke exists
				if (f.hasOwnProperty('stroke')) {
					if (f.stroke.hasOwnProperty('color')) {
						strokeColor = utils.rgbaToHex(f.stroke.color).toUpperCase();
					}
					if (f.stroke.hasOwnProperty('opacity')) {
						strokeOpacity = f.stroke.opacity;
					}
					if (f.stroke.hasOwnProperty('width')) {
						strokeWidth = f.stroke.width;
					}
					if (f.stroke.hasOwnProperty('linecap')) {
						strokeLinecap = f.stroke.linecap;
					}
					if (f.stroke.hasOwnProperty('dashstyle')) {
						strokeDashstyle = f.stroke.dashstyle;
					}
				}
				// Punkt-stilar?? Det verkar så.
				if (f.hasOwnProperty('circle')) {
					if (f.circle.hasOwnProperty('stroke')) {
						if (f.circle.stroke.hasOwnProperty('color')) {
							strokeColor = utils.rgbaToHex(f.circle.stroke.color);
						}
						if (f.circle.stroke.hasOwnProperty('width')) {
							strokeWidth = f.circle.stroke.width;
						}
					}
					if (f.circle.hasOwnProperty('fill')) {
						if (f.circle.fill.hasOwnProperty('color')) {
							fillColor = utils.rgbaToHex(f.circle.fill.color);
						}
					}
					if (f.circle.hasOwnProperty('radius')) {
						pointRadius = f.circle.radius;
					}
					if (f.circle.hasOwnProperty('color')) {
						pointFillColor = utils.rgbaToHex(f.circle.color);
					}
					if (f.circle.hasOwnProperty('source')) {
						pointSrc = f.circle.source;
					}
				}
		
				if (f.hasOwnProperty('label')) {
					if (f.label.hasOwnProperty('align')) {
						labelAlign = f.label.align;
					}
					if (f.label.hasOwnProperty('outlineColor')) {
						labelOutlineColor = utils.rgbaToHex(f.label.outlineColor);
					}
					if (f.label.hasOwnProperty('outlineWidth')) {
						labelOutlineWidth = f.label.outlineWidth;
					}
				}
		
				if (f.hasOwnProperty('font')) {
					if (f.font.hasOwnProperty('size')) {
						fontSize = f.font.size;
					}
					if (f.font.hasOwnProperty('color')) {
						fontColor = utils.rgbaToHex(f.font.color);
					}
					if (f.font.hasOwnProperty('backColor')) {
						fontBackColor = utils.rgbaToHex(f.font.backColor);
					}
				}
				if (f.hasOwnProperty('icon')) {
					if (f.icon.hasOwnProperty('src')) {
						externalGraphic = f.icon.src;
					}
					if (f.icon.hasOwnProperty('opacity')) {
						graphicOpacity = f.icon.opacity;
					}
				}
			});
		});

	}
    return printableLayers;
}

function executeMapfishCall(url, data) {
	var body = JSON.stringify(data);
	$('#o-dl-link').hide();
	$('#o-dl-progress').show();
	$('#o-dl-cancel').show();
	var request = $.ajax({
		type: 'POST',
		url: url,
		data: body,
		contentType: 'application/json',
		dataType: 'json',
		success: function (data) {
			var url = newUrl(data.getURL);
			console.log('SUCCESS', url);
			$('#o-dl-progress').hide();
			$('#o-dl-cancel').hide();
			//$('#o-dl-link').show().attr('href', data.getURL); // Leaving this in case of changes of mind.
			window.open(url);
		},
		error: function (data) {
			console.log('Error creating report: ' + data.statusText);
		}
	});
	return request;
}

// because mapfish can't return a dang url which isnt localhost
function newUrl(url) {
    var basePart = config.printCreate.substr(0, config.printCreate.indexOf('/', 8)) 
    var mapfishPart = url.substr(url.indexOf('/', 8), url.length -1)
    return basePart+mapfishPart
}

function printMap(settings) {
	var url = config.printCreate;
	return executeMapfishCall(url, convertToMapfishOptions(settings));
}

module.exports.printMap = printMap;
