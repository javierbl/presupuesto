function BudgetTreemap(selector, breakdown, stats, areas, aspectRatio, colorScale) {
  var width = $(selector).width();
  var height = width / (aspectRatio===undefined ? 2 : aspectRatio);
  var treemapData;
  var treemap = null;
  var treemapItems = null;
  var yearTotals = {};
  var maxTreemapValueEver = 0;
  var uiState = null;
  var formatPercent = d3.format(".2%");
  var textLabelMap = [];
  var i18n = [];
  var budgetStatuses = {};
  var transitionDuration = 650;
  var minSizeWithLabel = 20;
  var mouseOver = true;
  var paddedYears = {};
  var maxLevels = -1; // By default, don't limit treemap depth
  var $popup = $(selector+" .popover");

  // D3 category10 scale as starting point
  var category10 = (colorScale && colorScale.length > 0) ?
                    colorScale :
                    [ "#A9A69F", "#D3C488", "#2BA9A0", "#E8A063", "#9EBF7B", "#dbb0c0", "#7d8f69", "#a29ac8", "#6c6592", "#9e9674", "#e377c2", "#e7969c", "#bcbd22", "#17becf" ];
  var colors = d3.scale.ordinal().range(category10).domain([0,1,2,3,4,5,6,7,8,9]);


  // Getters/setters
  this.initialized = function() {
    return treemap !== null;
  };

  this.i18n = function(_) {
    if (!arguments.length) return _;
    i18n = _;
    return this;
  };

  this.budgetStatuses = function(_) {
    if (!arguments.length) return _;
    budgetStatuses = _;
    return this;
  };

  this.colorScale = function(_) {
    if (!arguments.length) return category10;
    category10 = _;
    colors = d3.scale.ordinal().range(category10).domain([0,1,2,3,4,5,6,7,8,9]);
    return this;
  };

  this.maxLevels = function(_) {
    if (!arguments.length) return maxLevels;
    maxLevels = _;
    return this;
  };

  this.maxTreemapValueEver = function(_) {
    if (!arguments.length) return maxTreemapValueEver;
    maxTreemapValueEver = _;
    return this;
  };

  this.mouseOver = function(_) {
    if (!arguments.length) return mouseOver;
    mouseOver = _;
    return this;
  };


  // Initialization
  var svg = d3.select(selector)
          .append("svg:svg")
          .attr("class", "treemap-chart")
          .style("position", "relative")
          .style("width", width + "px")
          .style("height", height + "px")
          .append("svg:g")
          .attr("transform", "translate(-.5,-.5)");

  // Calculate year totals, needed for percentage calculations later on
  function calculateYearTotals(breakdown, field, columns) {
    for (var year in columns) {
      if ( !yearTotals[year] )
        yearTotals[year] = {};
      var column_name = columns[year];
      yearTotals[year][field] = breakdown[field][column_name] || 0;
    }
  }

  // Convert the data to the format D3.js expects
  function loadBreakdownField(breakdown, field, columns) {
    // Get a blank dummy child, copy of the given one, to be used for padding (see below)
    function getDummyChild(item) {
      var dummy = {
          id: item.id,
          name: item.name,
          leaf: true
      };
      for (var year in columns) {
        dummy[year] = 0;
      };
      return dummy;
    }

    function getChildrenTree(items, level) {
      var children = [];
      for (var id in items) {
        if ($.isEmptyObject(items[id][field])) continue;
        var child = {
          id: id,
          name: items[id].label,
          leaf: true
        };
        // Get children, recursively
        if ( maxLevels==-1 || level<maxLevels ) {
          if (items[id].sub) {
            child.leaf = false;
            child.children = getChildrenTree(items[id].sub, level+1);
          }
        }
        // Get numerical data, 'padding' the tree structure if needed.
        // Padding is needed because the trees/breakdowns need to have the same depth across
        // the years, but our data often has different levels of detail. So we pad.
        var dummy = getDummyChild(child);
        var paddingNeeded = false;
        for (var year in columns) {
          var column_name = columns[year];
          child[year] = items[id][field][column_name] || 0;

          // 'Pad' the current item if its children don't add up to its value.
          if ( child[year] && child.children ) { 
            var children_sum = child.children.reduce(function(a,b) { return a+b[year]; }, 0);
            if ( child[year] != children_sum ) {
              paddingNeeded = true;
              paddedYears[year] = true;
              dummy[year] = child[year] - children_sum; // Quite sure children_sum is 0, but just in case
            }
          }
        }
        if ( paddingNeeded )
          child.children.push(dummy);

        children.push(child);
      }
      return children;
    }

    return {
      name: field,
      children: getChildrenTree(breakdown.sub, 1)
    };
  }

  function loadBreakdown(breakdown, field) {
    // Pick the right column for each year: execution preferred over 'just' budget...
    // TODO: This bit is duplicated in BudgetStackedChart
    var columns = {};
    for (var column_name in breakdown.years) {
      var year = breakdown.years[column_name];

      // ...unless we know the execution data is not complete (the year is not over),
      // in which case we go with the budget.
      if ( budgetStatuses[year] && budgetStatuses[year]!='' && column_name.indexOf("actual_")===0 )
        continue;

      // Normally we do this:
      if ( !columns[year] || column_name.indexOf("actual_")===0 )
        columns[year] = column_name;
    }

    // In some rather unusual cases we actually have no data: we may have one year of execution
    // data for a year that is not complete, for example. It happens. In those cases, we
    // hide the visualization. It's not ideal for a visualization to hide its parent container,
    // but there's not a simple clean solution: the way the code is structured now,
    // the calling code doesn't know whether there's data, since it involves looking into
    // budget statuses and so on (i.e. the code we just above)
    if ( Object.keys(columns).length==0 )
      $(selector).hide();

    calculateYearTotals(breakdown, field, columns);
    treemapData = loadBreakdownField(breakdown, field, columns);
  }

  // Calculate the maximum value of the treemap along the years.
  // Note that we use already calculated 'year totals', which will use _either_ budget or actual
  // spending, not both. This matches the data we use for display. Using both budget and actual
  // would be wrong, although in normal scenarios the difference wouldn't be huge.
  this.calculateMaxTreemapValueEver = function(uiState) {
    var maxValue = 0;
    for (var year in yearTotals) {
      maxValue = Math.max(maxValue, getValue(yearTotals[year].income || 0, uiState.format, 'income', year) );
      maxValue = Math.max(maxValue, getValue(yearTotals[year].expense || 0, uiState.format, 'expense', year) );
    }
    return maxValue;
  };

  // Adjust the overall treemap size based on the size of this year's budget compared to the biggest ever
  this.adjustTreemapSize = function(uiState) {
    var maxValue = maxTreemapValueEver || this.calculateMaxTreemapValueEver(uiState);
    var ratio = Math.sqrt( getValue(yearTotals[uiState.year][uiState.field], uiState.format, uiState.field, uiState.year) / maxValue );
    var newWidth = width*ratio - 2; // A couple of pixels of padding to avoid clipping
    var newHeight = height*ratio - 2;
    treemap.size([newWidth,newHeight]);
    svg
      .transition()
      .duration(transitionDuration)
      .attr("transform", "translate(" + (width - newWidth)/2 + "," + (height - newHeight)/2 + ")");

    svg.select('g.bg').select('rect')
      .attr('width', newWidth+'px')
      .attr('height', newHeight+'px');
  };

  // Initialize and display the treemap, using a fade-in animation.
  this.createTreemap = function(newUIState) {
    // Do nothing if called multiple times
    if ( treemap !== null )
      return;

    // Load the data. We do it here, and not at object creation time, so we have time
    // to change default settings (treemap depth, f.ex.) if needed
    loadBreakdown(breakdown, newUIState.field);

    // Do nothing if there's no data
    if ( !yearTotals[newUIState.year] || !yearTotals[newUIState.year][newUIState.field] )
      return;

    uiState = newUIState;

    // Create a transparent background just to avoid blinking when moving along the gaps of the squares
    svg.append("g")
      .attr('class','bg cell')
      .append("rect")
      .attr('x', '0px')
      .attr('y', '0px')
      .attr('width', width+'px')
      .attr('height', height+'px')
      .on("mouseover", function(d, i) {
        if (mouseOver)
          svg.selectAll("rect.cell").attr("class", "cell out");
      })
      .on("mouseout", function(d, i) {
        if (mouseOver)
          svg.selectAll("rect.cell").attr("class", "cell");
      })
      .attr('style', 'fill-opacity: 0');


    treemap = d3.layout.treemap()
                .size([width,height])
                .sort(function(a, b) { return a.value - b.value; })
                .value(function(d) { return (d[uiState.year] > 1) ? d[uiState.year] : 1; })
                .padding(0)
                .sticky(true);

    // Create the initial layout
    var g = svg.data([treemapData]).selectAll("g")
        .data(treemap.nodes)
      .enter().append("g")
        .attr("class", "cell")
        .style("opacity", 1);

    treemapItems = g.append("rect")
      .attr("class", function(d){ return "cell cell-"+d.id.charAt(0); })
      .style("fill", function(d) { return colors(parseInt(d.id[0], 10)); })
      .on("mouseover",  onMouseOver)
      .on("mousemove",  onMouseMove)
      .on("mouseout",   onMouseOut)
      .on("click", function(d, i) {
        $(selector).trigger('policy-selected', d);
      });

    // Render the treemap
    this.drawTreemap(uiState);
  };

  // Update the year or format of a treemap.
  // Note: you can't change the field being displayed, i.e. expense vs. income.
  this.updateTreemap = function(newUIState) {
    // Do nothing before initialization
    if ( treemap === null )
      return;

    // Do nothing if there's no change
    if ( uiState && sameUIState(uiState, newUIState) ) return;

    // Do nothing if there's no data
    if ( !yearTotals[newUIState.year] || !yearTotals[newUIState.year][newUIState.field] ) {
      svg.style("opacity", 0);
      return;
    } else
      svg.style("opacity", 1);

    // We prefer the 'sticky' layout in the treemap, but it needs to have a consistent data structure
    // across the years. (One item more or less is bearable, but a whole level appearing breaks
    // the layout: the new items get displayed along only one dimension.) So we disable the
    // 'stickyness' when we move between years with different levels of detail.
    if ( uiState.year != newUIState.year ) {
      var shouldBeSticky = (paddedYears[uiState.year] == paddedYears[newUIState.year]);
      // Resetting sticky to true resets the treemap internal cache; we don't want that, so check.
      // See https://github.com/mbostock/d3/wiki/Treemap-Layout#wiki-sticky
      if ( treemap.sticky() != shouldBeSticky )
        treemap.sticky(shouldBeSticky);
    }

    // Remove text inside the treemap and create once the animation has ended
    svg.selectAll(".treemap-text").remove();

    // Render the treemap
    uiState = newUIState;
    this.drawTreemap(uiState);
  };

  // Render the treemap
  this.drawTreemap = function(uiState) {
    // Update the overall size of the treemap,...
    this.adjustTreemapSize(uiState);

    // and the size and position of each of its rectangles.
    // Do it through a transition so there's a smooth animation on year change.
    svg.selectAll("g.cell").data(treemap.nodes); // Update treemap data

    treemapItems
      .transition()
      .duration(transitionDuration)
      .call(cell)
      .each("end",function(d,i) {
        // Ended the animation - create the new texts
        if ( i === 1 ) {
          setLabels();
        }
      });
  };


  // Treemap functions
  function cell() {
    var internalPadding = 1.5;
    this.attr("x", function(d) { return d.x + "px"; })
        .attr("y", function(d) { return d.y + "px"; })
        // XXX: This way of padding doesn't fully respect the cells proportions, keep the padding minimal until improved
        .attr("width", function(d) { return (d.dx >= internalPadding ? d.dx - internalPadding : 0) + "px"; })
        .attr("height", function(d) { return (d.dy >= internalPadding ? d.dy - internalPadding : 0) + "px"; })
        .style('opacity', function(d) { return d.leaf == true ? '1' : '0'; })
        .attr("leaf", function(d) { return d.leaf; });
  }

  function myFormatAmount(value) {
    if (value == null) return '';
    value = Number(value/100); // Also note value is in cents originally
    return formatNumber(value)+'€';
  }

  function setLabels() {

    treemapItems.each(function(d) {

      if ( d.leaf && d.dx > minSizeWithLabel && d.dy > minSizeWithLabel ) {

        var width = Math.max(d.dx - 8, 0) * 0.9;    // .9 is a safety margin
        var height = Math.max(d.dy - 8, 0);
        var length = textWidth(d.name);
        var area = width * height;
        var size = 8*Math.sqrt(area/(length*10));  // We're using a 10px*10px font size for calculation

        var text = d3.select(this.parentNode)
          .append("text")
          .attr("class", "treemap-text")
          .attr("width", width)
          .attr("height", height)
          .style("font-size", Math.min(size,30)+"px" )
          .attr("x", d.x + d.dx/2 )
          .attr("y", d.y )
          .attr("dy", 1.2)
          .text(d.name+": "+myFormatAmount(d[2017]))
          .call(wrap);
      }
    });
  }

  // Based on https://gist.github.com/gka/7469245
  // Kind of assumes text width is 10px
  function textWidth(str) {
    function charW(c) {
      if (c == 'W' || c == 'M') return 15;
      else if (c == 'w' || c == 'm') return 12;
      else if (c == 'I' || c == 'i' || c == 'l' || c == 't' || c == 'f') return 4;
      else if (c == 'r') return 8;
      else if (c == c.toUpperCase()) return 12;
      else return 10;
    }
 
    var length = 0;
    for (var i = 0, len = str && str.length; i < len; i++) {
      length += charW(str[i]);
    };
    return length;
  }

  // Wrap an area text so it fits nicely within the allowed limits.
  // This is a hard problem. I initially used bigText [1], but it handles only one line at a time,
  // so I had to break the original text into lines in a very rough way, with manual retouches
  // that didn't scale. I looked at slabText [2], which auto-splits into lines, but unlike
  // the original full-blown algorithm [3], it doesn't control vertical space, so it's quite useless
  // for us. I've ended adapting Mike Bostock's code [4] for wrapping labels, adding some basic
  // calculations to find a good-enough font size that fills most of the space.
  // Looking into hyphenation [5] would probably be the next logical move to improve quality.
  //
  // [1]: https://github.com/zachleat/BigText
  // [2]: http://freqdec.github.io/slabText/
  // [3]: http://erikloyer.com/index.php/blog/the_slabtype_algorithm_part_4_final_layout_and_source_code/
  // [4]: http://bl.ocks.org/mbostock/7555321
  // [5]: https://code.google.com/p/hyphenator/
  function wrap(text) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          width = text.attr("width"),
          maxTextWidth = 0,
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          x = text.attr("x"),
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width && line.length > 1) {
          line.pop();
          tspan.text(line.join(" "));
          maxTextWidth = Math.max(maxTextWidth, tspan.node().getComputedTextLength()); // Keep track of max length line
          line = [word];
          tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
      maxTextWidth = Math.max(maxTextWidth, tspan.node().getComputedTextLength()); // Check last line

      if ( maxTextWidth > width ) {
        var currentSize = parseFloat(text.style("font-size"));
        text.style("font-size", (currentSize*width/maxTextWidth)+"px");
      }
    });
  }

  function _(s) {
    return i18n[s] || s;
  }
  
  function onMouseOver(d) {
    if (!mouseOver) return;

    var selected = this;
    treemapItems.attr("class", function() {
      return (this == selected) ? "cell in" : "cell out";
    });
    var areaPrefix = areas[d.id[0]] ? areas[d.id[0]] : '';
    $popup.find(".popover-subtitle").css('color', colors(Number(d.id[0]))).html(areaPrefix);
    $popup.find(".popover-title").html(d.name);
    $popup.find(".popover-content-value").html(valueFormat(d.value, uiState));
    $popup.show();
  }

  function onMouseMove(d) {
    var popParentOffset = $(selector).offset();
    var popLeft         = d3.event.pageX - popParentOffset.left - $popup.width()/2;
    var popBottom       = $(selector).height() - d3.event.pageY + popParentOffset.top + 15;
    $popup.css({"left":popLeft, "bottom":popBottom});
  }
  
  function onMouseOut(d) {
    if (!mouseOver) return;
    treemapItems.attr("class", function(d){ return "cell cell-"+d.id.charAt(0); });
    $popup.hide();
  }
  
  function getValue(value, format, field, year) {
    switch (format) {
      case "nominal":
        return value;
      case "real":
        return adjustInflation(value, stats, year);
      case "percentage":
        var total = (field == "expense") ? yearTotals[year].expense : yearTotals[year].income;
        // Avoid division by zero (f.ex. when only one of the sides is available)
        return total > 0 ? value/total : 0;
      case "per_capita":
        var population = getPopulationFigure(stats, year);
        return adjustInflation(value, stats, year) / population;
    }
  }

  function valueFormat(value, uiState) {
    var transformedValue = getValue(value, uiState.format, uiState.field, uiState.year);
    switch (uiState.format) {
      case "nominal":
        return formatAmount(transformedValue);
      case "real":
        return formatAmount(transformedValue);
      case "percentage":
        return formatPercentage(transformedValue);
      case "per_capita":
        return formatDecimalAmount(transformedValue, 2);
    }
  }
}
