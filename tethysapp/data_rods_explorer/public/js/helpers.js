function current_date(day_offset, hh) {
    var today = new Date();
    today.setDate(today.getDate() - day_offset);
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (hh === undefined) {
        var hh = today.getHours();
    }
    if (dd<10) {
        dd = '0' + dd;
    }
    if (mm<10) {
        mm = '0' + mm;
    }
    if (hh<10) {
        hh = '0' + hh;
    }
    var date_st = yyyy + '-' + mm  + '-' + dd + 'T' + hh;
    return date_st;
}

function getPrevRodsDate(date, days_before) {
    var modDate = date.split('T')[0];
    var newDate = new Date(modDate);

    newDate.setDate(newDate.getDate() - days_before);

    return newDate.toISOString().split('T')[0] + 'T00';
}

function getPrevDateHourPickerDate(datePickerDate) {
    var rodsDate = dateHourPickerToRodsDate(datePickerDate);
    var rodsDateEarlier = getPrevRodsDate(rodsDate, 7);

    return rodsDateToDateHourPickerDict(rodsDateEarlier)['date'];
}

function loadVariableOptions(mod12, var12, data) {
    var GET = data ? data : getUrlVars();
    if (GET[mod12]) {
        var model12 = GET[mod12];
        clearPrevOptions(var12);
        var vecOption = VAR_DICT[model12];
        var selectElement = document.getElementById(var12);
        for(var i = 0, l = vecOption.length; i < l; i++) {
            var vec = vecOption[i];
            selectElement.options.add(new Option(vec.text, vec.value, vec.selected));
        }
        if (GET['model'] === GET['model2'] && var12 === 'variable2') {
            removeVariable2Options(GET['variable']);
        }
        selectElement.selectedIndex = 0;
    }
}

function removeVariable2Options(varia) {
    var selectElement = document.getElementById('variable2');
    for (var i=0; i<selectElement.length; i++) {
        if (varia==selectElement.options[i].value) {
            selectElement.remove(i);
        }
    }
}

function clearPrevOptions(var12) {
    var selectElement = document.getElementById(var12);
    while(selectElement.options.length>0) {
        selectElement.remove(0);
    }
}

function getUrlVars(href) {
    var vars = {};
    if (href === undefined) {
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
    } else {
        var parts = href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
    }
    return vars;
}

function dateHourPickerToRodsDate(date, hour) {
    hour = (hour === undefined) ? "" : "T" + hour;
    var dd = date.split('/');
    var ymd = dd[2] + '-' + dd[0] + '-' + dd[1];

    return ymd + hour;
}

function rodsDateToDateHourPickerDict(rodsDate) {
    var dd = rodsDate.replace('T','-').split('-');
    var mdy = dd[1] + '/' + dd[2] + '/' + dd[0];
    var hh = dd[3];
    var datehour_dict = new Object();
    datehour_dict['date'] = mdy;
    datehour_dict['hour'] = hh;
    return datehour_dict;
}

function load_map_post_parameters() {
    var map = TETHYS_MAP_VIEW.getMap();
    var view = map.getView();
    var extent = view.calculateExtent(map.getSize());
    var topleft = ol.proj.toLonLat([extent[0], extent[3]]);
    var bottomright = ol.proj.toLonLat([extent[2], extent[1]]);
    var zoom = view.getZoom();
    var center = ol.proj.toLonLat(view.getCenter());
    document.getElementById('lonW').value = topleft[0];
    document.getElementById('latS').value = bottomright[1];
    document.getElementById('lonE').value = bottomright[0];
    document.getElementById('latN').value = topleft[1];
    document.getElementById('zoom').value = zoom;
    document.getElementById('centerX').value = center[0];
    document.getElementById('centerY').value = center[1];
    return extent
}

function load_map() {
    document.getElementById('loadMap').value = "no";
    var extent = load_map_post_parameters();
    document.getElementById('retrieveMap').value = "yes";
    var data = $('#parametersForm').serialize();
    data += '&plotTime=' + getUrlVars()['plotTime'];
    data += '&variable=' + getUrlVars()['variable'];
    data += '&model=' + getUrlVars()['model'];
    var variaIndex = $('#variable').find(':selected').index();
    var variaLyrName = VAR_DICT[getUrlVars()['model']][variaIndex].layerName;
    showMapLoading();
    $.ajax({
        url: '/apps/data-rods-explorer/map/',
        type: 'POST',
        dataType: 'json',
        data: data,
        success: function (response) {
            hideMapLoading();
            if (response.hasOwnProperty('load_layer')) {
                if (response['load_layer'] !== undefined) {
                    var map = TETHYS_MAP_VIEW.getMap();
                    var lyrParams = {
                        'LAYERS': response['load_layer'],
                        'TILED': true
                    };
                    var newLayer = new ol.layer.Tile({
                        source: new ol.source.TileWMS({
                            url: response['geoserver_url'],
                            params: lyrParams,
                            serverType: 'geoserver'
                        })
                    });
                    map.addLayer(newLayer);
                    newLayer['tethys_legend_title'] = variaLyrName;
                    newLayer['tethys_legend_extent'] = extent;
                    newLayer['tethys_legend_extent_projection'] = 'EPSG:3857';

                    update_legend();
                    document.getElementById('loadMap').value = response['load_layer'];
                }
            }
        }, error: function () {
            hideMapLoading();
            console.error('Nice try... :(');
        }
    });
}

function createPlot(name) {
    load_map_post_parameters();
    document.getElementById('retrieveMap').value = "no";
    document.getElementById('prevPlot').value = "yes";
    var data = {};
    var formParams = $('#parametersForm').serializeArray();
    var urlParams = getUrlVars();
    Object.keys(urlParams).forEach(function (param) {
        data[param] = urlParams[param];
    });
    $(formParams).each(function (index, obj) {
        data[obj.name] = obj.value;
    });
    var pointLonLat = $('#pointLonLat').val();
    if (name === 'years') {
        data['overlap_years'] = $('#plot-overlapped').is(':checked');
    }

    if (pointLonLat === "-9999") {
        displayFlashMessage('no-query-location', 'warning', 'Query location not defined. Please click on map at desired query location.');
    } else if (pointIsOutOfBounds(pointLonLat, data['model'], data['model2'])) {
        displayFlashMessage('point-out-extents', 'warning', 'Query location outside of model extents. Please choose a new location.');
    } else {
        $('#plot-loading').removeClass('hidden');
        $.ajax({
            url: '/apps/data-rods-explorer/' + name + '/',
            type: 'POST',
            dataType: 'html',
            data: data,
            beforeSend: function (xhr, settings) {
                if (!checkCsrfSafe(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
                }
            },
            success: function (responseHTML) {
                if (responseHTML.indexOf('Error999') !== -1) {
                    $('#plot-loading').addClass('hidden');
                    displayFlashMessage('error999', 'warning', $(responseHTML).text());
                } else {
                    removeFlashMessage('error999');
                    $('#plot-container').html(responseHTML);
                    var plotType = $('.highcharts-plot').attr('data-type');
                    initHighChartsPlot($('.highcharts-plot'), plotType);
                    $('#plot-loading').addClass('hidden');

                    if (name === 'plot2') {
                        var opts = $('#plot2-options');
                        var series = opts.attr('data-series');
                        var y1Units = opts.attr('data-y1units');
                        var y2Units = opts.attr('data-y2units');
                        two_axis_plot(series, y1Units, y2Units);
                    }
                }
            }, error: function () {
                $('#plot-loading').addClass('hidden');
                displayFlashMessage('out-of-bouds', 'danger', 'Request out of spatial or temporal bounds');
            }
        });
    }
}

function showMapLoading() {
    $('#map-loading')
        .css({
            'height': $('#map_view').height(),
            'width': $('#map_view').width()
        })
        .removeClass('hidden');
}

function hideMapLoading() {
    $('#map-loading').addClass('hidden');
}

function addLegendItem(layer) {
    var title = layer.tethys_legend_title;
    var html =  '<li class="legend-item">' +
        '<div class="legend-buttons">' +
        '<a class="btn btn-default btn-legend-action zoom-control">' + title + '</a>' +
        '<a class="btn btn-default legend-dropdown-toggle">' +
        '<span class="caret"></span>' +
        '<span class="sr-only">Toggle Dropdown</span>' +
        '</a>' +
        '<div class="tethys-legend-dropdown">' +
        '<ul>' +
        '<li><a class="opacity-control">' +
        '<span>Opacity</span> ' +
        '<input type="range" min="0.0" max="1.0" step="0.01" value="' + layer.getOpacity() + '">' +
        '</a></li>' +
        '<li><a class="display-control" href="javascript:void(0);">Hide Layer</a></li>' +
        '</ul>' +
        '</div>' +
        '</div>';

    html += '</li>';

    // Append to the legend items
    $('.legend-items').append(html);

    // Bind events for controls
    var last_item = $('.legend-items').children(':last-child');
    var menu_toggle_control = $(last_item).find('.legend-dropdown-toggle');
    var opacity_control = $(last_item).find('.opacity-control input[type=range]');
    var display_control = $(last_item).find('.display-control');
    var zoom_control = $(last_item).find('.zoom-control');

    // Bind toggle control
    menu_toggle_control.on('click', function(){
        var dropdown_menu = $(last_item).find('.tethys-legend-dropdown');
        dropdown_menu.toggleClass('open');
    });

    // Bind Opacity Control
    opacity_control.on('input', function() {
        layer.setOpacity(this.value);
    });

    // Bind Display Control
    display_control.on('click', function() {
        if (layer.getVisible()){
            layer.setVisible(false);
            $(this).html('Show Layer');
        } else {
            layer.setVisible(true);
            $(this).html('Hide Layer');
        }
    });

    // Bind Zoom to Layer Control
    zoom_control.on('click', function() {
        var extent;

        extent = layer.tethys_legend_extent;

        if (is_defined(extent)) {
            var lat_lon_extent = ol.proj.transformExtent(extent, layer.tethys_legend_extent_projection, "EPSG:3857");
            TETHYS_MAP_VIEW.getMap().getView().fit(lat_lon_extent, TETHYS_MAP_VIEW.getMap().getSize());
        }
    });
}

function is_defined(variable) {
    return !!(typeof variable !== typeof undefined && variable !== false);
}

function updateFences(differentiator, model) {
    updateTemporalFences(differentiator, model);
    updateSpatialFences(differentiator, model);
}

var update_legend = function() {
    var layers;

    // Clear the legend items
    $('.legend-items').empty();

    // Get current layers from the map
    layers = TETHYS_MAP_VIEW.getMap().getLayers();

    for (var i = layers.getLength(); i--; ) {
        addLegendItem(layers.item(i));
    }

    // Activate the drop down menus
    $('.dropdown-toggle').dropdown();
};

var initHighChartsPlot = function($element, plot_type) {
    if ($element.attr('data-json')) {
        var json_string, json;

        // Get string from data-json attribute of element
        json_string = $element.attr('data-json');

        // Parse the json_string with special reviver
        json = JSON.parse(json_string, functionReviver);
        $element.highcharts(json);
    }
    else if (plot_type === 'line' || plot_type === 'spline') {
        initLinePlot($element[0], plot_type);
    }
};

var functionReviver = function(k, v) {
    if (typeof v === 'string' && v.indexOf('function') !== -1) {
        var fn;
        // Pull out the 'function()' portion of the string
        v = v.replace('function ()', '');
        v = v.replace('function()', '');

        // Create a function from the string passed in
        fn = Function(v);

        // Return the handle to the function that was created
        return fn;
    } else {
        return v;
    }
};

var initLinePlot = function(element, plot_type) {
    var title = $(element).attr('data-title');
    var subtitle = $(element).attr('data-subtitle');
    var series = $.parseJSON($(element).attr('data-series'));
    var xAxis = $.parseJSON($(element).attr('data-xAxis'));
    var yAxis = $.parseJSON($(element).attr('data-yAxis'));

    $(element).highcharts({
        chart: {
            type: plot_type
        },
        title: {
            text: title,
            x: -20 //center
        },
        subtitle: {
            text: subtitle,
            x: -20
        },
        xAxis: {
            title: {
                text: xAxis['title']
            },
            labels: {
                formatter: function() {
                    return this.value + xAxis['label'];
                }
            }
        },
        yAxis: {
            title: {
                text: yAxis['title']
            },
            labels: {
                formatter: function() {
                    return this.value + yAxis['label'];
                }
            }
        },
        tooltip: {
            valueSuffix: '°C'
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        series: series
    });
};

var checkCsrfSafe = function (method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
};

var getCookie = function (name) {
    var cookie;
    var cookies;
    var cookieValue = null;
    var i;

    if (document.cookie && document.cookie !== '') {
        cookies = document.cookie.split(';');
        for (i = 0; i < cookies.length; i += 1) {
            cookie = $.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

function openDataRodsUrls(datarods_urls) {
    datarods_urls.forEach(function (url) {
        window.open(url);
    });
}

function displayFlashMessage(id, type, message) {
    $('.flash-messages').html(
        '<div id="' + id + '" class="alert alert-' + type + ' alert-dismissible" role="alert">' +
        '<b><span class="glyphicon glyphicon-' + type + '-sign" aria-hidden="true"></span>' +
        // '<button type="button" class="close" data-dismiss="alert">' +
        // '<span aria-hidden="true">&times;</span>' +
        // '<span class="sr-only">Close</span>' +
        // '</button>' +
        message +
        '</b></div>'
    );
    $('#app-content-wrapper').scrollTop(0);
}

function removeFlashMessage(id) {
    $('.flash-messages').find('#' + id).remove();
}

function pointIsOutOfBounds(pointLonLat, model1, model2) {
    if (typeof pointLonLat === 'string') {
        pointLonLat = pointLonLat.split(',');
    }
    var model1Extents, model2Extents;
    var minX, maxX, minY, maxY;

    if (model1) {
        model1Extents = MODEL_FENCES[model1].extents;
        minX = parseFloat(model1Extents.minX);
        maxX = parseFloat(model1Extents.maxX);
        minY = parseFloat(model1Extents.minY);
        maxY = parseFloat(model1Extents.maxY);
        if (pointLonLat[0] < minX || pointLonLat[0] > maxX || pointLonLat[1] < minY || pointLonLat[1] > maxY) {
            return true;
        }
    }

    if (model2 && model2 !== model1) {
        model2Extents = MODEL_FENCES[model2].extents;
        minX = parseFloat(model2Extents.minX);
        maxX = parseFloat(model2Extents.maxX);
        minY = parseFloat(model2Extents.minY);
        maxY = parseFloat(model2Extents.maxY);
        if (pointLonLat[0] < minX || pointLonLat[0] > maxX || pointLonLat[1] < minY || pointLonLat[1] > maxY) {
            return true;
        }
    }

    return false;
}

function disablePlotButtonIfNeeded() {
    var lonlat = document.getElementById('pointLonLat').value;
    if (pointIsOutOfBounds(lonlat, $('#model').val(), $('#model2').val())) {
        $('a[name*=plot]').add('a[name=years]').addClass('disabled');
    }
}

function getValidRodsDate(date, model) {
    var validDate;
    var key = 'end_date';
    var modelDate = new Date(MODEL_FENCES[model][key]);

    if (modelDate < new Date(date.split('T')[0])) {
        validDate = modelDate.toISOString().split('T')[0];
    } else {
        validDate = date;
    }


    return validDate.split('T')[0] + 'T23';
}

function validateExtents(extents) {

    if (extents.minY === '-90.0') {
        extents.minY = '-85.0';
    }
    if (extents.maxY == '90.0') {
        extents.maxY = '85.0';
    }

    return extents;
}

function constructHref(params) {
    var href = window.location.href.split('?')[0] + "?";
    Object.keys(params).forEach(function (param) {
        href += param + '=' + params[param] + '&';
    });

    return href.slice(0, -1);
}

function returnEarlierDateHourPickerDate(date1, date2) {
    var earlierDate;
    date1 = new Date(date1);
    date2 = new Date(date2);
    if (date1 <= date2) {
        earlierDate = date1;
    } else {
        earlierDate = date2;
    }
    return earlierDate.toLocaleDateString()
}

function returnLaterDateHourPickerDate(date1, date2) {
    var laterDate;
    date1 = new Date(date1);
    date2 = new Date(date2);
    if (date1 >= date2) {
        laterDate = date1;
    } else {
        laterDate = date2;
    }
    return laterDate.toLocaleDateString()
}

function updateTemporalFences(modelNum) {
    var model1 = $('#model1').val();
    var model2 = $('#model2').val();
    var earliestDateForModel1 = MODEL_FENCES[model1].start_date;
    var latestDateForModel1 = MODEL_FENCES[model1].end_date;
    var model2BoundsModified = false;

    var $endDate = $('#endDate' + modelNum);
    var $startDate = $('#startDate' + modelNum);

    if (modelNum === '1') {
        var $plotDate = $('#plot_date');

        var $datePickers = $endDate.add($plotDate);

        $datePickers.each(function (idx, elem) {
            $(elem).datepicker('setStartDate', earliestDateForModel1);
            $(elem).datepicker('setEndDate', latestDateForModel1);
            if (Date.parse($(elem).val()) > Date.parse(latestDateForModel1)) {
                $(elem).val(latestDateForModel1);
            } else if (Date.parse($(elem).val()) < Date.parse(earliestDateForModel1)) {
                $(elem).val(earliestDateForModel1);
            }
        });
        if ($startDate.length > 0) {
            $startDate.datepicker('setStartDate', earliestDateForModel1);
            $startDate.datepicker('setEndDate', $endDate.val());

            if (Date.parse($startDate.val()) > Date.parse(latestDateForModel1)) {
                $startDate.val(getPrevDateHourPickerDate(latestDateForModel1));
            } else if (Date.parse($endDate.val()) < Date.parse(earliestDateForModel1)) {
                $startDate.val(earliestDateForModel1);
            }
        }

    }

    if (model2 !== undefined) {
        var earliestDateForModel2 = MODEL_FENCES[model2].start_date;
        var latestDateForModel2 = MODEL_FENCES[model2].end_date;
        var lowerDateBound = returnLaterDateHourPickerDate(earliestDateForModel2, earliestDateForModel1);
        var upperDateBound = returnEarlierDateHourPickerDate(latestDateForModel2, latestDateForModel1);

        if (Date.parse(earliestDateForModel2) !== Date.parse(lowerDateBound)) {
            model2BoundsModified = true
        }

        if (Date.parse(latestDateForModel2) !== Date.parse(upperDateBound)) {
            model2BoundsModified = true
        }

        $endDate.datepicker('setStartDate', lowerDateBound);
        $endDate.datepicker('setEndDate', upperDateBound);

        if (Date.parse($endDate.val()) > Date.parse(upperDateBound)) {
            $endDate.val(upperDateBound);
        } else if (Date.parse($endDate.val()) < Date.parse(lowerDateBound)) {
            $endDate.val(lowerDateBound);
        }

        $startDate.datepicker('setStartDate', lowerDateBound);
        $startDate.datepicker('setEndDate', $endDate.val());

        if (Date.parse($startDate.val()) > Date.parse(upperDateBound)) {
            $startDate.val(getPrevDateHourPickerDate(upperDateBound));
        } else if (Date.parse($endDate.val()) < Date.parse(lowerDateBound)) {
            $startDate.val(lowerDateBound);
        }

        if (model2BoundsModified) {
            displayFlashMessage('bounds-adjusted', 'info', 'Note: Model 2 date bounds were adjusted to mutually valid dates for the two models.')
        } else {
            removeFlashMessage('bounds-adjusted');
        }
    }
}

function updateSpatialFences(differentiator, model) {
    var extents = validateExtents(MODEL_FENCES[model].extents);
    var minX = parseFloat(extents.minX);
    var maxX = parseFloat(extents.maxX);
    var minY = parseFloat(extents.minY);
    var maxY = parseFloat(extents.maxY);

    var geojsonObject = {
        'type': 'FeatureCollection',
        'crs': {
            'type': 'name',
            'properties': {
                'name': 'EPSG:4326'
            }
        },
        'features': [{
            'type': 'Feature',
            'geometry': {
                'type': 'Polygon',
                'coordinates': [[
                    ol.proj.fromLonLat([minX, maxY]),
                    ol.proj.fromLonLat([maxX, maxY]),
                    ol.proj.fromLonLat([maxX, minY]),
                    ol.proj.fromLonLat([minX, minY]),
                    ol.proj.fromLonLat([minX, maxY])
                ]]
            }
        }]
    };

    var layer = differentiator === '1' ? MODEL1_LAYER : MODEL2_LAYER;

    layer.getSource().clear();
    layer.getSource().addFeatures((new ol.format.GeoJSON()).readFeatures(geojsonObject));
    layer['tethys_legend_extent'] = [minX, minY, maxX, maxY];
    layer['tethys_legend_extent_projection'] = 'EPSG:4326';
}