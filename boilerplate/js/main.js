(function () {

    //pseudo-global variables
    var attrArray = ["STATE", "stateparks", "parkpercapita", "foodbankpercapita", "library", "librarypercapita", "publicbookspercapita", "literacyrates", "populationwithbachelors", "studentteacherratio", "schoolspercapita"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    var max = 100;

    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 460,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear()
        .range([chartHeight, 0])
        //change scale value? my values are very low? standard through population
        .domain([0, max]);

    //begin script when window loads
    window.onload = setMap();
    //sets up choropleth map
    function setMap() {

        //map frame dimensions
        var width = window.innerWidth * 0.425,
            height = 460;

        //create new svg container for the map
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3
            .geoAlbersUsa()

            .scale(600)

            .translate([width / 2, height / 2]);

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        //aka load multiple datasets
        var promises = [
            d3.csv("data/litdata.csv"),
            d3.json("data/UsCountries.topojson")

        ];
        Promise.all(promises).then(callback);


        function callback(data) {
            var csvData = data[0], us = data[1];

            setGraticule(map, path);

            var usCountries = topojson.feature(us, us.objects.us_states).features;

            //here I am missing what example 1.9 line68-72??
            usCountries = joinData(usCountries, csvData);

            //console.log(usCountries)


            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(usCountries, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add dropdown
            createDropdown(csvData);

        }
    }

    function setGraticule(map, path) {
        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude



        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

    }

    function joinData(usCountries, csvData) {

        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.STATE; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < usCountries.length; a++) {

                var geojsonProps = usCountries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.STATE; //the geojson primary key
                //console.log("geojson key: " + geojsonKey + " csv key: " + csvKey)
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {
                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                }
            }
        }

        return usCountries;
    }

    //function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            // "#feedde",
            // "#fdbe85",
            // "#fd8d3c",
            // "#e6550d",
            // "#a63603"
            "#ffffd4",
            "#fed98e",
            "#fe9929",
            "#d95f0e",
            "#993404",
            // "#D4B9DA",
            // "#C994C7",
            // "#DF65B0",
            // "#DD1C77",
            // "#980043"
        ];
        //I think i might need to change my scale classification?
        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }
        max = d3.max(domainArray);

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    //use this to style in css
    function setEnumerationUnits(usCountries, map, path, colorScale) {

        var regions = map
            .selectAll(".regions")
            .data(usCountries)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "regions id" + d.properties.STATE;
            })
            .attr("d", path)
            .style("fill", function (d) {
                //console.log(d.properties)
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }

            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
        var desc = regions.append("desc").text('{"stroke": "#fff", "stroke-width": "0.5px"}');
    }


    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //moved this to global? at top
        //chart frame dimensions
        // var chartWidth = window.innerWidth * 0.425,
        //     chartHeight = 460;
        // leftPadding = 25,
        //     rightPadding = 2,
        //     topBottomPadding = 5,
        //     chartInnerWidth = chartWidth - leftPadding - rightPadding,
        //     chartInnerHeight = chartHeight - topBottomPadding,
        //     translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
        //ver chart should it be var chartbackground
        //create a second svg element to hold the bar chart
        var chart = d3
            .select("body")
            .append("svg")
            .attr("width", chartWidth)
            //ok this changes nothing? me thinks
            //.attr("width", (chartInnerWidth + csvData.length - 1))
            .attr("x", function (d, i) {
                return (i * (chartInnerWidth / csvData.length) + leftPadding)
            })
            .attr("height", chartHeight)
            .attr("class", "chart");
        //i think this also moved to be global 
        //create a scale to size bars proportionally to frame
        // var yScale = d3.scaleLinear()
        //     .range([0, chartHeight])
        //     .domain([0, 105]);
        //set bars for each province
        var bars = chart
            .selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "bars id" + d.STATE;
            })
            //should I change line below?
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel)
            .attr("x", function (d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            //I feel like this is wrong ..above lines? check solution code
            .attr("height", function (d) {
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            }).style("fill", function (d) {
                return colorScale(d[expressed]);
            });
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)//change title position 
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " + expressed[3] + " in Each State");


        //how do I change this to have 0 at the bottom
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
        
        //create frame for chart border
        //this is the grey box
        var chartFrame = chart
            .append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');

    }
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData) {
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) { return d })
            .text(function (d) { return d });
    };

    //dropdown change listener handler
    function changeAttribute(attribute, csvData) {
        //change expressed attribute
        expressed = attribute;
        //recreating assigned colorscale
        var colorScale = makeColorScale(csvData);
        //coloring/filling enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            })
        var bars = d3.selectAll(".bars")
            //Sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function (d, i) {
                return i * 20
            })
            .duration(500);
        console.log(csvData.length)
        updateChart(bars, csvData.length, colorScale);
    }


    //Sort, resize, and recolor bars


    function updateChart(bars, n, colorScale) {
        yScale = d3.scaleLinear()
            .range([chartHeight, 0])
            //change scale value? my values are very low? standard through population
            .domain([0, max]);

        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        d3.select(".axis").call(yAxis);
        //position barz
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //resize barz
        bars.attr("height", function (d, i) {
            return 463 - yScale(parseFloat(d[expressed]));

        })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //recolor barzz
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);

                } else {
                    return "#ccc";
                }
                //uhhh I heard gareth say something like this below
                //var max = d3.
            })

        var chartTitle = d3
            .select(".chartTitle")
            .text(expressed + " in each state");
        //this log is working
        //console.log("sup")
    }

    //function to highlight enumeration units and bars
    function highlight(props) {

        //change stroke also props = propertioes
        var selected = d3.selectAll(".id" + props.STATE)
            .style("stroke", "white")
            .style("stroke-width", "2");

        setLabel(props)

    }



    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3
            .selectAll(".id" + props.STATE)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }

        d3.select(".infolabel").remove();

    }

    //function to create dynamic label
    function setLabel(props) {
        console.log(props[expressed])
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.adm1_code + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.NAME);
    }
    //y is the line throug it huhhh
    //function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
        console.log(labelWidth)

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }
    //I put this into new function of updateChart ? 
    // .attr("x", function (d, i) {
    //     return i * (chartInnerWidth / csvData.length) + leftPadding;
    // })
    // //resize bars
    // .attr("height", function (d, i) {
    //     return 463 - yScale(parseFloat(d[expressed]));
    // })
    // .attr("y", function (d, i) {
    //     return yScale(parseFloat(d[expressed])) + topBottomPadding;
    // })
    // //recolor bars
    // .style("fill", function (d) {
    //     var value = d[expressed];
    //     if (value) {
    //         return colorScale(value);
    //     } else {
    //         return "#ccc";
    //     }
    // });


})();
