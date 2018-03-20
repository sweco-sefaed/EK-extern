"use strict";

var $ = require('jquery');
var utils = require('../utils');
var options = require('./../../conf/printSettings');
var print = require('./print');
var printarea = require('./printarea');
var Viewer = require('../viewer');
var ol = require('openlayers');
var $printButton, $printButtonTool, $printselect, vector, $scaleselect, $orientationselect;



function init() {
	$.getJSON('http://localhost:8080/geoserver/pdf/info.json', function(data) {
		buildPanel(data);
	});



	function buildPanel(config) {
		console.log(config);
		var outputFormats = config.outputFormats.map(function(format) {
			return format.name.toUpperCase();
		});

		var layouts = config.layouts.map(function(layout) {
			return layout.name;
		});

		var scales = config.scales.map(function(scale) {
			return scale.value;
		});

		var dpis = config.dpis.map(function(dpi) {
			return dpi.value;
		});

		var menuEl = '<form type="submit">' +
			'<div id="o-printmenu" class="o-printmenu">' +
				'<h5 id="o-main-setting-heading">Skriv ut karta</h5>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Format</span>' +
					utils.createRadioButtons(outputFormats, 1) +
				'</div>' +
				'<br />' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Orientering</span>' +
					utils.createRadioButtons(options.orientation, 2) +
				'</div>' +
				'</br>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Storlek</span>' +
					'<select id="o-size-dd" class="o-dd-input">' +
					utils.createDdOptions(options.sizes) +
					'</select>' +
				'</div>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Mall</span>' +
					'<select id="o-template-dd" class="o-dd-input">' +
					utils.createDdOptions(layouts) +
					'</select>' +
				'</div>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Skala</span>' +
					'<select id="o-scale-dd" class="o-dd-input">' +
					utils.createDdOptions(scales) +
					'</select>' +
				'</div>' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Upplösning</span>' +
					'<select id="o-resolution-dd" class="o-dd-input">' +
					utils.createDdOptions(dpis) +
					'</select>' +
				'</div>' +
				'<br />' +
				'<div class="o-block">' +
					'<span class="o-setting-heading">Titel<span><br />' +
					'<input id="o-title-input" class="o-text-input" type="text" />' +
				'</div>' +
				'<br />' +
				'<div class="o-block">' +
					'<input type="checkbox" id="o-legend-input" />' +
					'<label for="o-legend-input">Teckenförklaring</label>' +
				'</div>' +
				'<br />' +
					'<div class="o-block">' +
					'<button id="o-print-create-button" class="btn" type="button">Skapa</button>' +
				'</div>' +
			'</div>' +
			'</form>';

		$('#o-map').append(menuEl);

		var printButton = utils.createButton({
			id: 'o-printmenu-button-close',
			cls: 'o-no-boxshadow',
			iconCls: 'o-icon-menu-fa-times',
			src: '#fa-times',
			tooltipText: 'Stäng meny',
			tooltipPlacement: 'west'
		});

		$('#o-main-setting-heading').append(printButton);

		var printButtonTool = utils.createButton({
			id: 'o-print-tool',
			iconCls: 'o-icon-fa-print',
			src: '#fa-print'
		});

		$('#o-toolbar-misc').append(printButtonTool);
		$printButtonTool = $('#o-print-tool');
		$printButton = $('#o-printmenu-button-close');
		$printselect = $('#o-size-dd');
		$scaleselect = $('#o-scale-dd');
		$orientationselect = $("input:radio[name='group2']");
		bindUIActions();
	}
}

function bindUIActions() {
	var polygon = false;
	$printButton.on('click', function (e) {
		$("#o-printmenu").removeClass('o-printmenu-show');
		e.preventDefault();
	});
	$printButtonTool.on('click', function (e) {
		if ($("#o-printmenu").hasClass('o-printmenu-show')) {
			$("#o-printmenu").removeClass('o-printmenu-show');
		} else {
			if (!vector) {
				vector = printarea.printA1();
				polygon = true;
				var paper = getPaperMeasures('A1');
				printarea.addPreview(100000, paper);
				$("#o-printmenu").addClass('o-printmenu-show');
			} else {
				$("#o-printmenu").addClass('o-printmenu-show');
			}

		}
		e.preventDefault();
	});
	$printselect.change(function () {
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
		scale = scale.split(':')[1];
		printarea.addPreview(scale, paper);
	});

	$scaleselect.change(function () {
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
		scale = scale.split(':')[1];
		printarea.addPreview(scale, paper);
	});

	$orientationselect.change(function () {
		var map = Viewer.getMap();
		var paper = getPaperMeasures($printselect.val());
		var scale = $scaleselect.val();
		scale = scale.split(':')[1];
		printarea.addPreview(scale, paper);
	});

	function getPaperMeasures(format) {
		var orientationLandscape = $('input[name=group2]:checked').val() == 1,
			width = 0,
			height = 0;

		switch (format) {
			case 'A1':
				width = orientationLandscape ? 841 : 594,
					height = orientationLandscape ? 594 : 841
				break;
			case 'A2':
				width = orientationLandscape ? 594 : 420,
					height = orientationLandscape ? 420 : 594
				break;
			case 'A3':
				width = orientationLandscape ? 420 : 297,
					height = orientationLandscape ? 297 : 420
				break;
			case 'A4':
				width = orientationLandscape ? 297 : 210,
					height = orientationLandscape ? 210 : 297
				break;
			case 'A5':
				width = orientationLandscape ? 210 : 148,
					height = orientationLandscape ? 148 : 210
				break;
			case 'A6':
				width = orientationLandscape ? 148 : 105,
					height = orientationLandscape ? 105 : 148
				break;
		}

		return {
			width: width, //((width / 25.4)),
			height: height //((height / 25.4))
		};
	};


	$('#o-print-create-button').click(function (event) {
		var map = Viewer.getMap();
		var layer = map.getLayers();
		var extent = vector.getSource().getFeatures()[0].getGeometry().getExtent();
		var centerPoint =  ol.extent.getCenter(extent);

		var printLayers = [];
		for (var i = 0, l = layer.a.length; i < l; i++) {
			if (layer.a[i].S.visible) {
				printLayers.push(layer.a[i]);
			}
		}
		var contract = {
			url: "http://localhost:8080/geoserver/wms",
			dpi: $('#o-resolution-dd').val(),
			layers: printLayers,
			outputFormat: $('input[name=group1]:checked').parent('label').text().trim().toLowerCase(),
			scale: $('#o-scale-dd').val(),
			orientation: $('input[name=group2]:checked').val(),
			size: $('#o-size-dd').val(),
			title: $('#o-title-input').val(),
			layout: $('#o-template-dd').val(),
			center: centerPoint
		};
		print.printMap(contract);
		return false;
	});


}
module.exports.init = init;