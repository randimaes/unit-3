//begin script when window loads
window.onload = setMap();

function setMap() {

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3
        .select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // var projection = d3.geo.albersUsa()
    //     .scale(1000)
    //     .translate([width / 2, height / 2]);


    //create Albers equal area conic projection centered on France
    var projection = d3
        .geoAlbersUsa()

        .scale(900)

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
        csvData = data[0];
        us = data[1];

        console.log(data)

        //translate us TopoJSON
        var usCountries = topojson.feature(us, us.objects.us_states).features;
        // console.log(usCountries)

        //add state regions to map
        //console.log(map)
        //use this to style in css
        var regions = map
            .selectAll(".regions")
            .data(usCountries)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "regions " + d.properties.states;
            })
            .attr("d", path);

    }

    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines

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

};
