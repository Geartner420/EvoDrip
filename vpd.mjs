var dataLayer = dataLayer || [];
let vpdchart;
function getViewportWidth() {
    return document.getElementById("chart-card").offsetWidth
}
function getViewportHeight() {
    return document.getElementById("chart-card").offsetHeight
}
function showVerticalScroll() {
    let t = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      , e = document.createElement("div");
    e.style.height = 3 * t + "px",
    e.setAttribute("id", "createscroll"),
    document.getElementById("chart-card").appendChild(e)
}
function hideVerticalScroll() {
    document.getElementById("createscroll").remove()
}
!function(t) {
    let e = function(t, e) {
        this.options = e || {},
        this.chart = d3.select(t),
        this.chart.html(""),
        this.chartInner = null,
        this.rendered = 0,
        this.ticks = 10,
        this.leafTDiff = 2,
        this.tempUnit = "C",
        this.tempLink = 0,
        this.airRh = 50,
        this.airRhRaw = 50,
        this.airT = 25,
        this.airTRaw = 25,
        this.leafT = 23,
        this.leafTRaw = 23,
        this.vpd = 0,
        this.vpdMatrix = null,
        this.data = null,
        this.margin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        },
        this.viewportWidth = null,
        this.width = null,
        this.height = null,
        this.colWidth = null,
        this.rowWidth = null,
        this.tooltipDot = null,
        this.showTooltip = 0,
        this.labelCorrs = {},
        this.domainCelsius = [50, 0, .5],
        this.yScaleCelsius = null,
        this.yDomain = this.domainCelsius,
        this.xScale = null,
        this.yAxis = null,
        this.embed = this.options.embed ? this.options.embed : 0,
        this.ha = this.options.ha ? this.options.ha : 0,
        this.legend = 1,
        this.crops = [{
            id: "cannabis",
            name: "Cannabis",
            intervals: [{
                name: "Danger Zone (Under Transpiration)",
                color: "#1a6c9c",
                upper: .4
            }, {
                name: "Early Vegetative Growth / Propagation (Low Transpiration)",
                color: "#22ab9c",
                lower: .4,
                upper: .8
            }, {
                name: "Late Vegetative / Early Flower (Healthy Transpiration)",
                color: "#9cc55b",
                lower: .8,
                upper: 1.2
            }, {
                name: "Mid / Late Flower (High Transpiration)",
                color: "#e7c12b",
                lower: 1.2,
                upper: 1.6
            }, {
                name: "Danger Zone (Over Transpiration)",
                color: "#ce4234",
                lower: 1.6
            }],
            dew: !0,
            dewColor: "#969696",
            crossColor: "#ffffff",
            axisColor: "#ffffff",
            darkAxis: !1
        }, {
            id: "tomatoes",
            name: "Tomatoes",
            intervals: [{
                name: "Danger Zone (Under Transpiration)",
                color: "#1a6c9c",
                upper: .2
            }, {
                name: "Early growth",
                color: "#22ab9c",
                lower: .2,
                upper: .5
            }, {
                name: "Vegetative",
                color: "#9cc55b",
                lower: .5,
                upper: .8
            }, {
                name: "Flowering to mature fruiting",
                color: "#e7c12b",
                lower: .8,
                upper: 1.2
            }, {
                name: "Danger Zone (Over Transpiration)",
                color: "#ce4234",
                lower: 1.2
            }],
            dew: !0,
            dewColor: "#969696",
            crossColor: "#ffffff",
            axisColor: "#ffffff",
            darkAxis: !1
        }, {
            id: "cannabis-veg1",
            name: "Cannabis - Early Vegetative Growth / Propagation",
            intervals: [{
                name: "Early Vegetative Growth / Propagation",
                color: "#22ab9c",
                lower: .4,
                upper: .8
            }],
            dew: !1,
            dewColor: "#969696",
            crossColor: "#20303c",
            axisColor: "#20303c",
            darkAxis: !0
        }, {
            id: "cannabis-veg2",
            name: "Cannabis - Late Vegetative / Early Flower",
            intervals: [{
                name: "Late Vegetative / Early Flower",
                color: "#9cc55b",
                lower: .8,
                upper: 1.2
            }],
            dew: !1,
            dewColor: "#969696",
            crossColor: "#20303c",
            axisColor: "#20303c",
            darkAxis: !0
        }, {
            id: "cannabis-veg3",
            name: "Cannabis - Mid / Late Flower",
            intervals: [{
                name: "Mid / Late Flower",
                color: "#e7c12b",
                lower: 1.2,
                upper: 1.6
            }],
            dew: !1,
            dewColor: "#969696",
            crossColor: "#20303c",
            axisColor: "#20303c",
            darkAxis: !0
        }, {
            id: "leafy-greens",
            name: "Leafy Greens",
            intervals: [{
                name: "Vegetative Growth",
                color: "#9cc55b",
                lower: .8,
                upper: .95,
                temp_lower: 18,
                temp_upper: 25
            }],
            dew: !0,
            dewColor: "#969696",
            crossColor: "#20303c",
            axisColor: "#20303c",
            darkAxis: !0
        }, {
            id: "cucumber",
            name: "Cucumber",
            intervals: [{
                name: "very high humidity – conditions favouring infection of fungal diseases, and reducing photosynthesis",
                color: "#1a6c9c",
                upper: .2
            }, {
                name: "high humidity – conditions favourable for the survival of fungus pathogens and its development in already infected plants",
                color: "#22ab9c",
                lower: .2,
                upper: .4
            }, {
                name: "optimal humidity for plant cultivation",
                color: "#9cc55b",
                lower: .4,
                upper: 1.4
            }, {
                name: "insufficient humidity – conditions unfavourable for water use efficiency (efficiency reduction)",
                color: "#e7c12b",
                lower: 1.4
            }],
            dew: !0,
            dewColor: "#969696",
            crossColor: "#ffffff",
            axisColor: "#ffffff",
            darkAxis: !1
        }],
        this.cropI = 0,
        this.crop = this.crops[0],
        this.cropInHash = !1,
        this.vpdTargetState = !1,
        this.init()
    };
    e.prototype = {
        constructor: e,
        that: this,
        init: function() {
            this._setupPlayground(),
            this._initVpdMatrix(),
            this._initChartData(),
            this._setLabelCorrections(),
            this._createAxes(),
            this._createTooltip(),
            this._createChart()
        },
        log: function(t) {},
        resize: function() {
            this.log("resize"),
            this._clearChart(),
            this._setupPlayground(),
            this._setLabelCorrections(),
            this._createAxes(),
            this._createTooltip(),
            this._createChart(),
            this.renderChart()
        },
        _calculateVPD: function(t, e, i) {
            let r;
            return r = 610.7 * Math.pow(10, 7.5 * i / (237.3 + i)) / 1e3 - 610.7 * Math.pow(10, 7.5 * e / (237.3 + e)) / 1e3 * t / 100,
            r = Math.round(100 * (r + Number.EPSILON)) / 100,
            r
        },
        _calculateDP: function(t, e) {
            0 == t && (t = 1e-7);
            let i = 243.12
              , r = Math.log(t / 100) + 17.62 * e / (i + e);
            return i * r / (17.62 - r)
        },
        _setupPlayground: function() {
            this.log("_setupPlayground"),
            0 === this.ha && showVerticalScroll();
            let t = getViewportWidth();
            0 === this.ha && hideVerticalScroll(),
            this.viewportWidth = t,
            this.width = t - this.margin.left - this.margin.right,
            this.height = this.width,
            this.colWidth = this.width / 100,
            this.rowWidth = this.height / 100
        },
        _initVpdMatrix: function() {
            let t, e, i, r;
            this.log("_initVpdMatrix"),
            this.vpdMatrix = [],
            this.leafTDiff = this.airT - this.leafT;
            for (let a = 0; a <= 100; a++) {
                e = (100 - a) / 2,
                i = e - this.leafTDiff,
                t = [];
                for (let a = 0; a <= 100; a++) {
                    r = 100 - a;
                    const o = this._calculateVPD(r, e, i);
                    t.push(o)
                }
                this.vpdMatrix.push(t)
            }
        },
        _getVpdMatrixData: function(t, e, i, r, a, o, s, n) {
            let l = (100 - t) / 2
              , h = 100 - e
              , d = {};
            try {
                d = {
                    airT: l,
                    leafT: l - this.leafTDiff,
                    rh: h,
                    vpd: this.vpdMatrix[t][e],
                    dp: this._calculateDP(h, l),
                    onchart: 1
                }
            } catch (t) {
                console.error(t)
            }
            return i && d.vpd >= i && (d.onchart = 0),
            r && d.vpd < r && (d.onchart = 0),
            a && d.airT > a && (d.onchart = 0),
            o && d.airT < o && (d.onchart = 0),
            s && d.rh > s && (d.onchart = 0),
            n && d.rh < n && (d.onchart = 0),
            d
        },
        _initChartData: function() {
            this.log("_initChartData"),
            this.data = {
                under_dp: []
            };
            let t, e, i, r = [], a = [];
            for (let o = 0; o <= 100; o++) {
                t = (100 - o) / 2,
                e = t - this.leafTDiff;
                for (let t = 0; t <= 100; t++) {
                    i = this._getVpdMatrixData(o, t);
                    let s = o > 0 ? this._getVpdMatrixData(o - 1, t) : null;
                    e <= i.dp && (o > 0 && s && s.leafT > s.dp || 1 == o) && this.data.under_dp.push(this._getVpdMatrixData(o, t));
                    for (let e = this.crop.intervals.length - 1; e >= 0; e--) {
                        const s = this.crop.intervals[e].upper
                          , n = this.crop.intervals[e].lower
                          , l = this.crop.intervals[e].temp_upper
                          , h = this.crop.intervals[e].temp_lower
                          , d = this.crop.intervals[e].rh_upper
                          , c = this.crop.intervals[e].rh_lower;
                        this.data[e] || (this.data[e] = []),
                        i = this._getVpdMatrixData(o, t, s, n, l, h, d, c);
                        let p = null
                          , m = null;
                        o < 100 && (p = this._getVpdMatrixData(o + 1, t, s, n, l, h, d, c)),
                        o > 0 && (m = this._getVpdMatrixData(o - 1, t, s, n, l, h, d, c)),
                        i.onchart && (m && !m.onchart || 0 == o) && (a[e] || (a[e] = []),
                        a[e][t] = i),
                        i.onchart && (p && !p.onchart || 100 == o) && (r[e] || (r[e] = []),
                        r[e][t] = i)
                    }
                }
            }
            for (const [t,e] of a.entries())
                if (e)
                    for (const [i,a] of e.entries())
                        a && (r[t] && r[t][i] ? a.airT == a.airT0 ? a.airT0 = r[t][i].airT - 25 : a.airT0 = r[t][i].airT : a.airT0 = 0,
                        this.data[t].push(a))
        },
        _setLabelCorrections: function() {
            this.width < 576 || this.width >= 576 && this.width < 768 ? (this.labelCorrs = {
                xLeft: 1.25,
                xTop: .35,
                yLeft: 1,
                yTop: .45
            },
            this.ticks = 10) : this.width >= 768 && this.width < 992 ? (this.labelCorrs = {
                xLeft: .9,
                xTop: .1,
                yLeft: .4,
                yTop: .45
            },
            this.ticks = 10) : this.width >= 992 && this.width < 1200 ? (this.labelCorrs = {
                xLeft: .75,
                xTop: .15,
                yLeft: .4,
                yTop: .45
            },
            this.ticks = 20) : this.width >= 1200 && (this.labelCorrs = {
                xLeft: .65,
                xTop: .35,
                yLeft: .45,
                yTop: .45
            },
            this.ticks = 20)
        },
        _clearChart: function() {
            this.chart.html("")
        },
        _createChart: function() {
            let t = this;
            this.chartInner = this.chart.append("svg").attr("width", this.width).attr("height", this.height).attr("class", "chart"),
            0 === this.ha && this.chartInner.on("mouseover", (function(e) {
                t._showTooltip(e)
            }
            )).on("mouseleave", (function(e) {
                t._hideTooltip(e)
            }
            )).on("mousemove", (function(e) {
                t._animateTooltip(e)
            }
            )).on("click", (function(e) {
                t.vpdTargetState ? (VPDFormControls.toggleVpdTargetState(),
                t._gotoVpdTarget(e)) : !1 === isTouchDevice() && t._gotoVpd(e)
            }
            ))
        },
        _clearChartZones: function(t) {
            t ? (this.log("We clear only the crossline"),
            this.chartInner.selectAll(".crossline").remove(),
            this._clearSimilar()) : (this.chartInner.selectAll("*").remove(),
            this.rendered = 0),
            this._clearVpdTarget()
        },
        _createTooltip: function() {
            this.log("_createTooltip");
            const t = this.chart.append("svg").attr("width", this.width).attr("height", this.height).style("pointer-events", "none").style("position", "absolute").style("z-index", 1).attr("id", "tooltip-dots-layer");
            this.tooltipDot = t.append("rect").attr("x", -this.colWidth).attr("y", -this.rowWidth).attr("width", this.colWidth).attr("height", this.rowWidth).attr("class", "tooltip-dot"),
            this.tooltipTarget = t.append("svg").attr("x", -3 * this.colWidth).attr("y", -3 * this.rowWidth).attr("width", 3 * this.colWidth).attr("height", 3 * this.rowWidth),
            this.tooltipTarget.append("rect").attr("x", this.colWidth).attr("y", this.rowWidth).attr("width", this.colWidth).attr("height", this.rowWidth).attr("class", "target-rect"),
            this.tooltipTarget.append("line").attr("x1", this.rowWidth + this.rowWidth / 2).attr("y1", 0).attr("x2", this.rowWidth + this.rowWidth / 2).attr("y2", 3 * this.colWidth).style("stroke-width", "1px").attr("class", "target-line"),
            this.tooltipTarget.append("line").attr("x1", 0).attr("y1", this.rowWidth + this.rowWidth / 2).attr("x2", 3 * this.colWidth).attr("y2", this.rowWidth + this.rowWidth / 2).style("stroke-width", "1px").attr("class", "target-line"),
            this.tooltip = this.chart.append("div").style("opacity", .85).style("visibility", "hidden").style("background-color", "white").style("padding", "5px").style("position", "absolute").style("z-index", 2).attr("id", "letooltip").style("box-shadow", "0 0 20px 0 rgba(0,0,0,.15)"),
            !1 === isTouchDevice() && this.tooltip.style("pointer-events", "none"),
            this.showTooltip = 0
        },
        _hideTooltip: function(t) {
            (!1 === isTouchDevice() && 1 == this.showTooltip || !0 === isTouchDevice() && 1 == this.showTooltip && (!t || !t.toElement || "letooltip" != t.toElement.id && "a" != t.toElement.localName)) && (this.vpdTargetState ? this.tooltipTarget.style("visibility", "hidden") : this.tooltipDot.style("visibility", "hidden"),
            this.tooltip.style("visibility", "hidden"),
            this.showTooltip = 0)
        },
        _showTooltip: function(t) {
            0 == this.showTooltip && (this.vpdTargetState ? this.tooltipTarget.style("visibility", "visible") : this.tooltipDot.style("visibility", "visible"),
            (!1 === isTouchDevice() || !0 === isTouchDevice() && !this.vpdTargetState) && (this.tooltip.style("visibility", "visible"),
            this.showTooltip = 1))
        },
        _haShowTooltip: function(t, e) {
            const i = Date.now()
              , r = Math.trunc(t / this.colWidth)
              , a = Math.trunc(e / this.rowWidth);
            let o, s, n = "VPD = " + this._calculateVPD(this.airRhRaw, this.airTRaw, this.leafTRaw) + " kPa", l = this.airRhRaw, h = this.airTRaw, d = this.leafTRaw;
            if ("F" == this.tempUnit && (h = Math.round(10 * CtoF(h)) / 10,
            d = Math.round(10 * CtoF(d)) / 10),
            n += "<br />Air RH = " + l + " %<br />Air Temp = " + h + " °" + this.tempUnit + "<br />Leaf Temp = " + d + " °" + this.tempUnit + "<br /><span id='last-update' style='color: #7E8299'>Now</span>",
            this.tooltip.html(n),
            t < this.width / 2)
                o = r * this.colWidth + this.colWidth + this.margin.left;
            else {
                const t = this.tooltip.node().getBoundingClientRect().width;
                o = r * this.colWidth + this.margin.left - t
            }
            if (e < this.height / 2)
                s = a * this.rowWidth + this.rowWidth + this.margin.top;
            else {
                const t = this.tooltip.node().getBoundingClientRect().height;
                s = a * this.rowWidth + this.margin.top - t
            }
            this.tooltip.style("left", o + "px").style("top", s + "px"),
            this.tooltip.style("visibility", "visible"),
            this.showTooltip = 1,
            clearInterval(this.intId),
            this.intId = setInterval(( () => {
                const t = Date.now() - i;
                document.getElementById("last-update").innerHTML = timeAgo(t)
            }
            ), 3e3)
        },
        _animateTooltip: function(t) {
            const e = t.layerX - this.margin.left
              , i = t.layerY - this.margin.top
              , r = Math.trunc(e / this.colWidth)
              , a = Math.trunc(i / this.rowWidth)
              , o = this._getVpdMatrixData(100 - a, r);
            this.vpdTargetState ? this.tooltipTarget.attr("x", r * this.colWidth - this.colWidth).attr("y", a * this.rowWidth - this.rowWidth) : this.tooltipDot.attr("x", r * this.colWidth).attr("y", a * this.rowWidth);
            let s = o.airT
              , n = o.airT
              , l = o.airT - this.leafTDiff
              , h = l
              , d = !1;
            o.rh == this.airRh && s == this.airT && l == this.leafT && (d = !0),
            "F" == this.tempUnit && (s = Math.round(10 * CtoF(s)) / 10,
            l = Math.round(10 * CtoF(l)) / 10);
            let c, p, m = "";
            if (this.vpdTargetState ? m += "<strong>Set VPD target</strong> = " + o.vpd + " kPa" : m += d ? "VPD = " + this._calculateVPD(this.airRhRaw, this.airTRaw, this.leafTRaw) + " kPa" : "VPD = " + o.vpd + " kPa",
            d) {
                let t = this.airRhRaw
                  , e = this.airTRaw
                  , i = this.leafTRaw;
                "F" == this.tempUnit && (e = Math.round(10 * CtoF(e)) / 10,
                i = Math.round(10 * CtoF(i)) / 10),
                m += "<br />Air RH = " + t + " %<br />Air Temp = " + e + " °" + this.tempUnit + "<br />Leaf Temp = " + i + " °" + this.tempUnit
            } else
                m += "<br />Air RH = " + o.rh + " %<br />Air Temp = " + s + " °" + this.tempUnit + "<br />Leaf Temp = " + l + " °" + this.tempUnit;
            if (!0 === isTouchDevice() && (1 === this.embed ? m += '<br /><br /><a href="https://vpdchart.com/#' + [this.tempUnit, o.rh, s, l, this.cropI].join(",") + '" target="_blank">Discover more<br />on vpdchart.com</a>' : this.vpdTargetState || (VPDFormControls.setLocationHashParse(!0),
            m += '<div class="mt-3">',
            m += '<a class="btn btn-xs btn-primary font-weight-bold btn-block mb-3" href="#' + [this.tempUnit, o.rh, s, l, this.cropI].join(",") + '">Jump to these values</a>',
            m += '<a href="javascript:void(0);" class="btn btn-xs btn-primary font-weight-bold btn-block" onclick="vpdchart.setVpdTarget(' + [o.rh, n, h].join(",") + ');">Set as target values</a>',
            m += "</div>")),
            this.tooltip.html(m),
            e < this.width / 2)
                c = r * this.colWidth + this.colWidth + this.margin.left;
            else {
                const t = this.tooltip.node().getBoundingClientRect().width;
                c = r * this.colWidth + this.margin.left - t
            }
            if (i < this.height / 2)
                p = a * this.rowWidth + this.rowWidth + this.margin.top;
            else {
                const t = this.tooltip.node().getBoundingClientRect().height;
                p = a * this.rowWidth + this.margin.top - t
            }
            this.tooltip.style("left", c + "px").style("top", p + "px")
        },
        _gotoVpd: function(e) {
            const i = e.layerX - this.margin.left
              , r = e.layerY - this.margin.top
              , a = Math.trunc(i / this.colWidth)
              , o = Math.trunc(r / this.rowWidth)
              , s = this._getVpdMatrixData(100 - o, a);
            let n = s.airT
              , l = s.airT - this.leafTDiff;
            "F" == this.tempUnit && (n = Math.round(10 * CtoF(n)) / 10,
            l = Math.round(10 * CtoF(l)) / 10);
            let h = [this.tempUnit, s.rh, n, l, this.cropI].join(",");
            1 === this.embed ? (dataLayer.push({
                event: "embed_chart_click",
                crop: this.cropI
            }),
            window.open("https://vpdchart.com/#" + h, "vpdchart.com")) : (dataLayer.push({
                event: "chart_click",
                crop: this.cropI
            }),
            VPDFormControls.setLocationHashParse(!0),
            window.location.hash = h),
            t("#slider_rh_at").html("&nbsp;"),
            t("#slider_air_temp_at").html("&nbsp;"),
            t("#slider_leaf_temp_at").html("&nbsp;")
        },
        _gotoVpdTarget: function(t) {
            const e = t.layerX - this.margin.left
              , i = t.layerY - this.margin.top
              , r = Math.trunc(e / this.colWidth)
              , a = Math.trunc(i / this.rowWidth)
              , o = this._getVpdMatrixData(100 - a, r);
            this.setVpdTarget(o.rh, o.airT, o.leafT)
        },
        _clearSimilar: function() {
            this.chartInner.selectAll(".similar").remove()
        },
        _calculateNewRh: function(t, e, i) {
            return (10 * (.42 * t * Math.exp(10 * e * .006235398) / 10).toFixed(2) / (.42 * Math.exp(10 * i * .006235398))).toFixed(2)
        },
        _clearVpdTarget: function() {
            this.tooltipTarget.style("visibility", "hidden"),
            this.chartInner.select("#vpd-target-line-to").remove()
        },
        setVpdTarget: function(e, i, r) {
            this._clearVpdTarget(),
            toastr.remove(),
            this.chartInner.append("line").attr("x1", this.xScale(this.airRh) + this.rowWidth / 2).attr("y1", this.yScaleCelsius(this.airT) + this.rowWidth / 2).attr("x2", this.xScale(e) + this.rowWidth / 2).attr("y2", this.yScaleCelsius(i) + this.rowWidth / 2).style("stroke", this.crop.crossColor).style("stroke-width", "3px").style("stroke-dasharray", "3,3").attr("id", "vpd-target-line-to"),
            this.tooltipTarget.attr("x", this.xScale(e) - this.colWidth).attr("y", this.yScaleCelsius(i) - this.rowWidth),
            this.tooltipTarget.style("visibility", "visible");
            let a = this._calculateNewRh(this.airRh, this.airT, i)
              , o = ""
              , s = ""
              , n = 0;
            if (e == this.airRh && i == this.airT)
                s += "You're good! Nothing to do.";
            else {
                i > this.airT ? (n++,
                s += "Increase air temperature from " + ("F" == this.tempUnit ? CtoF(this.airT) : this.airT) + " °" + this.tempUnit + " to " + ("F" == this.tempUnit ? CtoF(i) : i) + " °" + this.tempUnit + ". ",
                s += "Air RH will start to drop from " + this.airRh + "% along with temperature.") : i < this.airT && (n++,
                s += "Decrease air temperature from " + ("F" == this.tempUnit ? CtoF(this.airT) : this.airT) + " °" + this.tempUnit + " to " + ("F" == this.tempUnit ? CtoF(i) : i) + " °" + this.tempUnit + ". ",
                s += "Air RH will start to raise from " + this.airRh + "% along with temperature."),
                a > e ? (n++,
                2 == n ? (s += "<br /><br />",
                s += "Meanwhile, start to remove moisture from the air (replace moist air with drier air by ventilation, or use dehumidifiers).",
                this.airRh < e ? (s += "<br />This is counter-intuitive, but RH has to raise from " + this.airRh + "% to " + e + "%, even if moisture is removed from air",
                s += " (due to the fact that RH raise, caused by air temperature decrease, should be bigger than RH drop, caused by moisture removal from air).") : this.airRh > e ? s += " RH has to drop from " + this.airRh + "% to " + e + "%." : (s += "<br />This is counter-intuitive, but RH has to maintain the same value (" + this.airRh + "%), even if moisture is removed from air",
                s += " (due to the fact that RH raise, caused by air temperature decrease, should be equal to RH drop, caused by moisture removal from air).")) : s += "Decrease air RH from " + this.airRh + "% to " + e + "% (replace moist air with drier air by ventilation, or use dehumidifiers).") : a < e && (n++,
                2 == n ? (s += "<br /><br />",
                s += "Meanwhile, start to add water vapor to the air (operate fog or misting devices).",
                this.airRh > e ? (s += "<br />This is counter-intuitive, but RH has to drop from " + this.airRh + "% to " + e + "%, even if water vapor is added to air",
                s += " (due to the fact that RH drop, caused by air temperature increase, should be bigger than RH raise, caused by water vapor addition to air).") : this.airRh < e ? s += " RH has to raise from " + this.airRh + "% to " + e + "%." : (s += "<br />This is counter-intuitive, but RH has to maintain the same value (" + this.airRh + "%), even if water vapor is added to air",
                s += " (due to the fact that RH drop, caused by air temperature increase, should be equal to RH raise, caused by water vapor addition to air).")) : s += "Increase air RH from " + this.airRh + "% to " + e + "%");
                s += "<br /><br />" + '<span class="svg-icon svg-icon-warning svg-icon-md">\x3c!--begin::Svg Icon | path:/var/www/preview.keenthemes.com/metronic/releases/2021-05-14-112058/theme/html/demo1/dist/../src/media/svg/icons/Code/Warning-2.svg--\x3e<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1">\n    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n        <rect x="0" y="0" width="24" height="24"/>\n        <path d="M11.1669899,4.49941818 L2.82535718,19.5143571 C2.557144,19.9971408 2.7310878,20.6059441 3.21387153,20.8741573 C3.36242953,20.9566895 3.52957021,21 3.69951446,21 L21.2169432,21 C21.7692279,21 22.2169432,20.5522847 22.2169432,20 C22.2169432,19.8159952 22.1661743,19.6355579 22.070225,19.47855 L12.894429,4.4636111 C12.6064401,3.99235656 11.9909517,3.84379039 11.5196972,4.13177928 C11.3723594,4.22181902 11.2508468,4.34847583 11.1669899,4.49941818 Z" fill="#000000" opacity="0.3"/>\n        <rect fill="#000000" x="11" y="9" width="2" height="7" rx="1"/>\n        <rect fill="#000000" x="11" y="17" width="2" height="2" rx="1"/>\n    </g>\n</svg>\x3c!--end::Svg Icon--\x3e</span>' + "  Make changes in small steps to allow time for adjustment and try to stay as close as possible to the dotted line. Avoid sudden changes that create stress for the plants.",
                o = "Target: VPD=" + this._calculateVPD(e, i, r) + " kPa",
                o += ", Air RH=" + e + "%",
                o += ", Air Temp=" + ("F" == this.tempUnit ? CtoF(i) : i) + "°" + this.tempUnit,
                o += ", Leaf Temp=" + ("F" == this.tempUnit ? CtoF(r) : r) + "°" + this.tempUnit
            }
            toastrNotif(o, s, "info", !1),
            !0 === isTouchDevice() && t("html, body").animate({
                scrollTop: t("#kt_header_mobile").height()
            }, 1e3),
            this._hideTooltip(),
            dataLayer.push({
                event: "vpd_target",
                crop: this.cropI
            })
        },
        showSimilar: function() {
            for (let t = 0; t <= 100; t++)
                for (let e = 0; e <= 100; e++) {
                    const i = this._getVpdMatrixData(t, e);
                    this.vpd != i.vpd || this.airRh == i.airRh && this.airT == i.airT || this.chartInner.append("rect").attr("x", this.xScale(i.rh)).attr("y", this.yScaleCelsius(i.airT)).attr("width", this.colWidth).attr("height", this.rowWidth).style("fill", this.crop.crossColor).attr("class", "similar")
                }
            dataLayer.push({
                event: "show_similar",
                crop: this.cropI
            })
        },
        renderChart: function(t) {
            this.log("renderChart\n\n");
            const e = this.xScale
              , i = this.yScaleCelsius
              , r = this.rowWidth;
            if (t && this.rendered)
                this.log("We render only the crossline");
            else {
                this.rendered = 1;
                for (let t = this.crop.intervals.length - 1; t >= 0; t--) {
                    const a = this.chartInner.append("path").datum(this.data[t]).attr("fill", this.crop.intervals[t].color).style("opacity", 1).on("mouseover", (function() {
                        a.style("opacity", 1)
                    }
                    )).on("mouseout", (function() {
                        a.style("opacity", 1)
                    }
                    )).attr("d", d3.area().curve(d3.curveStepAfter).x((function(t) {
                        return e(t.rh)
                    }
                    )).y0((function(t) {
                        return i(t.airT0)
                    }
                    )).y1((function(t) {
                        return i(t.airT) + r
                    }
                    )))
                }
                if (!1 !== this.crop.dew) {
                    this.chartInner.append("path").datum(this.data.under_dp).attr("fill", this.crop.dewColor).style("opacity", 1).attr("d", d3.area().curve(d3.curveStepAfter).x((function(t) {
                        return e(t.rh)
                    }
                    )).y0(i(0)).y1((function(t) {
                        return i(t.airT) + r
                    }
                    )));
                    this.log("Useless")
                }
                if (0 === this.embed) {
                    const t = this.chartInner.append("text").attr("x", e(0)).attr("y", i(50)).attr("text-anchor", "end").style("fill", "#181c32").style("opacity", .5).style("pointer-events", "none").text("vpdchart.com")
                      , r = t.node().getBBox();
                    t.attr("x", e(0) - r.height / 2),
                    t.attr("y", i(50) - r.height / 2)
                } else {
                    let t = this;
                    const r = this.chartInner.append("rect").attr("x", e(0)).attr("y", i(50)).attr("width", 1).attr("height", 1).style("fill", "#000000").attr("class", "calculate-on").on("click", (function(e) {
                        e.stopPropagation(),
                        dataLayer.push({
                            event: "embed_chart_click",
                            crop: this.cropI
                        }),
                        0 == t.ha ? window.open("https://vpdchart.com/" + window.location.hash, "_blank") : window.open("https://vpdchart.com/", "_blank")
                    }
                    ));
                    0 == this.ha && r.on("mouseover", (function(e) {
                        e.stopPropagation(),
                        t._hideTooltip()
                    }
                    )).on("mouseout", (function(e) {
                        e.stopPropagation(),
                        t._showTooltip()
                    }
                    ));
                    const a = this.chartInner.append("text").attr("x", e(0)).attr("y", i(50)).style("pointer-events", "none").attr("text-anchor", "end").style("fill", "#ffffff").text("by vpdchart.com")
                      , o = a.node().getBBox();
                    a.attr("x", e(0) - .5 * o.height),
                    a.attr("y", i(50) - o.height),
                    r.attr("x", e(0) - o.width - o.height),
                    r.attr("y", i(50) - 1.75 * o.height),
                    r.attr("width", o.width + o.height),
                    r.attr("height", 1 * o.height)
                }
            }
            const a = Math.round(e(this.airRh) / this.colWidth) * this.colWidth
              , o = Math.round(i(this.airT) / this.rowWidth) * this.rowWidth;
            this.chartInner.append("line").attr("x1", a - this.colWidth).attr("y1", o + this.rowWidth / 2).attr("x2", 0).attr("y2", o + this.rowWidth / 2).style("stroke-dasharray", 2 * this.colWidth + "," + 2 * this.rowWidth).style("stroke", this.crop.crossColor).style("stroke-width", "1px").attr("class", "crossline"),
            this.chartInner.append("line").attr("x1", a + 2 * this.colWidth).attr("y1", o + this.rowWidth / 2).attr("x2", this.width).attr("y2", o + this.rowWidth / 2).style("stroke-dasharray", 2 * this.colWidth + "," + 2 * this.rowWidth).style("stroke", this.crop.crossColor).style("stroke-width", "1px").attr("class", "crossline"),
            this.chartInner.append("line").attr("x1", a + this.colWidth / 2).attr("y1", o - this.rowWidth).attr("x2", a + this.colWidth / 2).attr("y2", 0).style("stroke-dasharray", 2 * this.colWidth + "," + 2 * this.rowWidth).style("stroke", this.crop.crossColor).style("stroke-width", "1px").attr("class", "crossline"),
            this.chartInner.append("line").attr("x1", a + this.colWidth / 2).attr("y1", o + 2 * this.rowWidth).attr("x2", a + this.colWidth / 2).attr("y2", this.height).style("stroke-dasharray", 2 * this.colWidth + "," + 2 * this.rowWidth).style("stroke", this.crop.crossColor).style("stroke-width", "1px").attr("class", "crossline"),
            this.chartInner.append("rect").attr("x", a).attr("y", o).attr("width", this.colWidth).attr("height", this.rowWidth).style("fill", this.crop.crossColor).attr("class", "crossline"),
            1 === this.ha && this._haShowTooltip(e(this.airRh), i(this.airT))
        },
        _createAxes: function() {
            this.log("_createAxes");
            let t = this.tempUnit
              , e = this.chart.append("svg").attr("width", this.width).attr("height", this.height).style("pointer-events", "none").style("position", "absolute").style("z-index", 1).attr("class", "axes");
            e.append("text").attr("transform", "rotate(-90)").attr("x", -this.width / 10).attr("dx", 0).attr("y", 0).attr("dy", "2.5em").attr("class", "axis-title").style("text-anchor", "end").text("← Air Temp"),
            e.append("text").attr("x", this.width - this.width / 10 + this.colWidth).attr("dx", 0).attr("y", 0).attr("dy", "2.5em").attr("class", "axis-title").style("text-anchor", "end").text("← Air RH"),
            this.xScale = d3.scaleLinear().range([0, this.width]).domain([100, 0]).clamp(!0);
            let i = e.append("g").attr("class", "x-axis").attr("color", "#ffffff").call(d3.axisTop(this.xScale).tickSize(0).tickFormat((function(t) {
                return t + " %"
            }
            )));
            i.selectAll(".tick:last-child").remove(),
            i.selectAll(".tick text").attr("y", 0).attr("x", 0).attr("transform", "translate(" + this.rowWidth * this.labelCorrs.xLeft + "," + this.colWidth * this.labelCorrs.xTop + ") rotate(-90)").style("text-anchor", "end"),
            this.yScaleCelsius = d3.scaleLinear().range([this.height, 0]).domain(this.domainCelsius).clamp(!0),
            this.yAxis = d3.axisLeft(this.yScaleCelsius).tickSize(0).tickFormat((function(e) {
                return e + " °" + t
            }
            ));
            let r = e.append("g").attr("class", "y-axis").attr("color", "#ffffff").call(this.yAxis);
            r.selectAll(".tick text").style("text-anchor", "start").attr("transform", "translate(" + this.colWidth * this.labelCorrs.yLeft + "," + this.rowWidth * this.labelCorrs.yTop + ")"),
            d3.selectAll(".domain").remove(),
            r.select(".tick:first-child").remove()
        },
        setTempUnit: function(e) {
            this.log("setTempUnit"),
            this.tempUnit = e,
            d3.selectAll(".y-axis .tick text").text((function(t, i) {
                return "F" == e ? CtoF(t) + " °" + e : t + " °" + e
            }
            )),
            t(".temp-u").html(e),
            t("#leaf_temp_diff option").each((function() {
                let i = t(this).val()
                  , r = i[0];
                i = parseFloat(i.substring(1)),
                "F" == e ? t(this).html(r + Math.round(10 * (CtoF(i) - CtoF(0))) / 10 + " °F") : t(this).html(r + i + " °C")
            }
            ));
            const i = t("#pulse_leaf_temp_diff");
            "F" == e ? i.text(i.attr("data-tempf") + " °F") : i.text(i.attr("data-tempc") + " °C"),
            t("#legend").html(VPDSettings.buildLegendHtml(this.crop))
        },
        setCrop: function(e) {
            this.log("setCrop"),
            dataLayer.push({
                event: "setCrop",
                crop: e
            }),
            this.cropI = e,
            this.crop = this.crops[e],
            !0 === this.crop.darkAxis ? t("#vpdchart").addClass("dark-axis") : t("#vpdchart").removeClass("dark-axis"),
            this.calculateNRender(1),
            0 === this.embed || 1 === this.embed && 1 === this.legend ? (t("#legend").html(VPDSettings.buildLegendHtml(this.crop)),
            t("#legend").show(),
            !1 === isTouchDevice() && t("[rel='tooltip-l']").tooltip({
                trigger: "hover",
                template: '<div class="tooltip tooltip-dark" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
            })) : t("#legend").hide(),
            "F" == this.tempUnit ? VPDFormControls.setLocationHash("F", this.airRh, CtoF(this.airT), CtoF(this.leafT)) : VPDFormControls.setLocationHash("C", this.airRh, this.airT, this.leafT),
            window.parent.postMessage(JSON.stringify({
                id: iframeId,
                height: t("#card-embed").outerHeight()
            }), "*")
        },
        calculateNRender: function(e) {
            this.log("calculateNRender");
            const i = this._calculateVPD(this.airRhRaw, this.airTRaw, this.leafTRaw)
              , r = this._calculateDP(this.airRhRaw, this.airTRaw);
            let a = t("#vpd");
            if (t(".vpd-val").html(i),
            this.vpd = i,
            this._initVpdMatrix(),
            this.leafT <= r && this.crop.dew)
                a.attr("style", "background-color: " + this.crop.dewColor + " !important; color: #ffffff !important;");
            else
                for (let t = this.crop.intervals.length - 1; t >= 0; t--) {
                    if (1 == this._getVpdMatrixData(Math.floor(100 - 2 * this.airT), Math.floor(100 - this.airRh), this.crop.intervals[t].upper, this.crop.intervals[t].lower, this.crop.intervals[t].temp_upper, this.crop.intervals[t].temp_lower, this.crop.intervals[t].rh_upper, this.crop.intervals[t].rh_lower).onchart) {
                        a.attr("style", "background-color: " + this.crop.intervals[t].color + " !important; color: #ffffff !important;");
                        break
                    }
                    a.attr("style", "background-color: #FAFAFA !important; color: #20303c;")
                }
            e ? this._clearChartZones() : this._clearChartZones(this.tempLink),
            this._initChartData(),
            e ? this.renderChart() : this.renderChart(this.tempLink)
        }
    },
    t.fn.vpdChart = function(i) {
        if (t(this).data("vpd-chart"))
            return t(this).data("vpd-chart");
        {
            let r = new e(t(this)[0],i);
            return t(this).data("vpd-chart", r),
            r
        }
    }
}(jQuery);
let VPDFormControls = function() {
    let t, e, i, r = 3, a = null, o = !0, s = 0, n = [0, 0], l = !1, h = !1, d = !1;
    const c = {
        step: 1,
        behaviour: "snap",
        animate: !1,
        range: {
            min: [1],
            max: [100]
        },
        connect: "lower",
        format: wNumb({
            decimals: 0
        })
    }
      , p = {
        step: .9,
        behaviour: "snap",
        animate: !1,
        range: {
            min: [32],
            max: [121.1]
        },
        connect: "lower",
        format: wNumb({
            decimals: 1
        })
    }
      , m = {
        step: .5,
        behaviour: "snap",
        animate: !1,
        range: {
            min: [0],
            max: [49.5]
        },
        connect: "lower",
        format: wNumb({
            decimals: 1
        })
    };
    let u = function() {
        n = [parseFloat(e.noUiSlider.get()), parseFloat(i.noUiSlider.get())]
    }
      , f = function() {
        vpdchart.log("VPDFormControls.initData");
        let t = vpdchart.tempUnit
          , e = vpdchart.airRh
          , i = vpdchart.airT
          , a = vpdchart.leafT
          , o = vpdchart.cropI;
        "0" == new URL(window.location.href).searchParams.get("legend") && (vpdchart.legend = 0);
        let s = window.location.hash;
        -1 !== s.indexOf("#settings") && $("#kt_quick_panel_toggle").trigger("click");
        let n = 0 === vpdchart.ha ? getSettings() : null
          , c = s.match(/^#?([CF]),(\d{1,3}(?:\.\d{1,4})?),(\d{1,3}(?:\.\d{1,4})?),(\d{1,3}(?:\.\d{1,4})?)(?:,(\d))?/i);
        c ? (t = c[1],
        e = parseFloat(c[2]),
        i = parseFloat(c[3]),
        a = parseFloat(c[4]),
        "F" == t && (i = FtoC(i),
        a = FtoC(a)),
        e < 0 && (e = 0),
        e > 100 && (e = 100),
        i < 0 && (i = 0),
        i > 49.5 && (i = 49.5),
        a < 0 && (a = 0),
        a > 49.5 && (a = 49.5),
        vpdchart.airRhRaw = e,
        vpdchart.airTRaw = i,
        vpdchart.leafTRaw = a,
        i = .5 * Math.round(i / .5),
        a = .5 * Math.round(a / .5),
        e = Math.round(e),
        c[5] && c[5] >= 0 && c[5] < vpdchart.crops.length ? (vpdchart.cropInHash = !0,
        o = parseInt(c[5]),
        $("#crop").val(o.toString())) : vpdchart.cropInHash = !1) : (vpdchart.cropInHash = !1,
        0 === vpdchart.embed && n.temp_unit && ["C", "F"].includes(n.temp_unit) && (t = n.temp_unit),
        0 === vpdchart.embed && "crop"in n && (o = parseInt(n.crop))),
        v(t),
        vpdchart.tempUnit != t && (vpdchart.setTempUnit(t),
        g(t, null)),
        0 === vpdchart.ha && "temp_link"in n && 1 == n.temp_link && (vpdchart.tempLink = 1,
        VPDFormControls.link()),
        r = 2,
        vpdchart.cropI = o,
        vpdchart.crop = vpdchart.crops[o],
        !0 === vpdchart.crop.darkAxis ? $("#vpdchart").addClass("dark-axis") : $("#vpdchart").removeClass("dark-axis"),
        vpdchart.airRh = e,
        0 === vpdchart.ha && (l = !0,
        VPDFormControls.setRh(e)),
        vpdchart.leafTDiff = i - a,
        vpdchart.airT = i,
        0 === vpdchart.ha && (h = !0,
        VPDFormControls.setAirTemp(i)),
        vpdchart.leafT = a,
        0 === vpdchart.ha && (d = !0,
        VPDFormControls.setLeafTemp(a)),
        0 === vpdchart.embed || 1 === vpdchart.embed && 1 === vpdchart.legend ? ($("#legend").html(VPDSettings.buildLegendHtml(vpdchart.crop)),
        $("#legend").show(),
        !1 === isTouchDevice() && $("[rel='tooltip-l']").tooltip({
            trigger: "hover",
            template: '<div class="tooltip tooltip-dark" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
        })) : $("#legend").hide(),
        1 === vpdchart.embed && $("#ribbon-link").attr("href", "https://vpdchart.com/" + window.location.hash),
        1 === vpdchart.ha && vpdchart.calculateNRender()
    }
      , v = function(t) {
        "F" == t ? $("#input-temp-unit").attr("checked", !0) : $("#input-temp-unit").removeAttr("checked")
    }
      , _ = function(t, e, i, r) {
        vpdchart.log("VPDFormControls.setLocationHash");
        let s = [t, e, i = Math.round(100 * i) / 100, r = Math.round(100 * r) / 100, vpdchart.cropI].join(",");
        "number" == typeof a && window.clearTimeout(a),
        a = window.setTimeout((function() {
            vpdchart.log("setLocationHash"),
            window.location.hash = s,
            a = null,
            1 === vpdchart.embed && $("#ribbon-link").attr("href", "https://vpdchart.com/#" + s)
        }
        ), 10),
        o = !1
    }
      , g = function(t, r) {
        if (1 === vpdchart.ha)
            return;
        vpdchart.log("VPDFormControls.updateSliders");
        let a = {}
          , o = {}
          , s = parseFloat(e.noUiSlider.get())
          , n = parseFloat(i.noUiSlider.get());
        if ("F" == t ? (a = Object.assign({}, p),
        s = CtoF(vpdchart.airT),
        a.start = [s],
        o = Object.assign({}, p),
        n = CtoF(vpdchart.leafT),
        o.start = [n]) : "C" == t && (a = Object.assign({}, m),
        s = vpdchart.airT,
        a.start = [s],
        o = Object.assign({}, m),
        n = vpdchart.leafT,
        o.start = [n]),
        1 === r) {
            let t = Math.round(10 * Math.abs(s - n)) / 10;
            n < s ? (a.padding = [t, 0],
            o.padding = [0, t]) : (a.padding = [0, t],
            o.padding = [t, 0])
        } else
            0 === r && (a.padding = [0, 0],
            o.padding = [0, 0]);
        e.noUiSlider.updateOptions(a, !0),
        i.noUiSlider.updateOptions(o, !0)
    };
    return {
        init: function() {
            vpdchart.log("VPDFormControls.init"),
            !1 === isTouchDevice() && $("[rel='tooltip']").tooltip({
                trigger: "hover",
                template: '<div class="tooltip tooltip-dark" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
            }),
            $("#input-temp-unit").on("change", (function(t) {
                let e;
                if (this.checked ? (e = "F",
                _("F", vpdchart.airRh, CtoF(vpdchart.airT), CtoF(vpdchart.leafT))) : (e = "C",
                _("C", vpdchart.airRh, vpdchart.airT, vpdchart.leafT)),
                vpdchart.setTempUnit(e),
                g(e, 1 === s ? 1 : null),
                u(),
                0 === vpdchart.embed) {
                    let t = getSettings();
                    t.temp_unit = e,
                    localStorage.setItem("settings", JSON.stringify(t))
                }
            }
            )),
            function() {
                if (vpdchart.log("VPDFormControls.initSliders"),
                1 === vpdchart.ha)
                    return;
                t = document.getElementById("slider_rh");
                const r = {
                    ...c,
                    start: vpdchart.airRh
                };
                noUiSlider.create(t, r),
                e = document.getElementById("slider_air_temp");
                const a = Object.assign({}, m);
                a.start = [vpdchart.airT],
                noUiSlider.create(e, a),
                i = document.getElementById("slider_leaf_temp");
                const o = Object.assign({}, m);
                o.start = [vpdchart.leafT],
                noUiSlider.create(i, o)
            }(),
            f(),
            function() {
                function a(t, i) {
                    if (!s)
                        return;
                    let r = e === i ? 0 : 1;
                    t -= n[r ? 0 : 1] - n[r],
                    i.noUiSlider.set(t)
                }
                1 !== vpdchart.ha && (vpdchart.log("VPDFormControls.initSlidersEvents"),
                t.noUiSlider.on("update", (function(e, i) {
                    vpdchart.log("sliderRh on update"),
                    1 == l && (l = !1);
                    let a = parseFloat(e[i]);
                    $("#slider_rh_value").html(a + " %"),
                    vpdchart._hideTooltip(),
                    toastr.remove(),
                    vpdchart.airRh = a,
                    null == t.getAttribute("disabled") && (vpdchart.airRhRaw = a),
                    0 == r ? (r = null,
                    vpdchart.calculateNRender()) : null != r ? r-- : vpdchart.calculateNRender(),
                    vpdchart.log("sliderRh > update > sliderUpdates", r)
                }
                )),
                t.noUiSlider.on("change", (function(t, e) {
                    0 == l && ("F" == vpdchart.tempUnit ? _("F", t[e], CtoF(vpdchart.airT), CtoF(vpdchart.leafT)) : _("C", t[e], vpdchart.airT, vpdchart.leafT))
                }
                )),
                e.noUiSlider.on("update", (function(t, i) {
                    vpdchart.log("sliderAirTemp on update"),
                    1 == h && (h = !1);
                    let a = parseFloat(t[i]);
                    $("#slider_air_temp_val").html(a),
                    "F" == vpdchart.tempUnit && (a = Math.round(100 * FtoC(a)) / 100),
                    vpdchart.airT = a,
                    null == e.getAttribute("disabled") && (vpdchart.airTRaw = a),
                    1 == s ? 0 == r ? (r = null,
                    vpdchart.calculateNRender()) : null != r ? r-- : r = 0 : null != r && r > 0 ? r-- : vpdchart.calculateNRender(),
                    vpdchart.log("sliderAirTemp > update > sliderUpdates", r)
                }
                )),
                e.noUiSlider.on("slide", (function(t, e) {
                    vpdchart.log("sliderAirTemp on slide"),
                    vpdchart._hideTooltip(),
                    a(t[e], i)
                }
                )),
                e.noUiSlider.on("change", (function(t, e) {
                    vpdchart.log("sliderAirTemp on change"),
                    u(),
                    0 == h && ("F" == vpdchart.tempUnit ? _("F", vpdchart.airRh, t[e], CtoF(vpdchart.leafT)) : _("C", vpdchart.airRh, t[e], vpdchart.leafT))
                }
                )),
                i.noUiSlider.on("update", (function(t, e) {
                    vpdchart.log("sliderLeafTemp on update"),
                    1 == d && (d = !1);
                    let a = parseFloat(t[e]);
                    $("#slider_leaf_temp_val").html(a),
                    "F" == vpdchart.tempUnit && (a = Math.round(100 * FtoC(a)) / 100),
                    vpdchart.leafT = a,
                    null == i.getAttribute("disabled") && (vpdchart.leafTRaw = a),
                    1 == s ? 0 == r ? (r = null,
                    vpdchart.calculateNRender()) : null != r ? r-- : r = 0 : null != r && r > 0 ? r-- : vpdchart.calculateNRender(),
                    vpdchart.log("sliderLeafTemp > update > sliderUpdates", r)
                }
                )),
                i.noUiSlider.on("slide", (function(t, i) {
                    vpdchart._hideTooltip(),
                    a(t[i], e)
                }
                )),
                i.noUiSlider.on("change", (function(t, e) {
                    u(),
                    0 == d && ("F" == vpdchart.tempUnit ? _("F", vpdchart.airRh, CtoF(vpdchart.airT), t[e]) : _("C", vpdchart.airRh, vpdchart.airT, t[e]))
                }
                )),
                n = [vpdchart.airT, vpdchart.leafT])
            }(),
            window.addEventListener("hashchange", (function() {
                vpdchart.log("hashchange event"),
                0 == o ? o = !0 : (r = 1 === vpdchart.tempLink ? 2 : 1,
                f())
            }
            ), !1)
        },
        setRh: function(e) {
            t.noUiSlider.set(e)
        },
        setAirTemp: function(t) {
            "F" == vpdchart.tempUnit ? e.noUiSlider.set(CtoF(t)) : e.noUiSlider.set(t)
        },
        setLeafTemp: function(t) {
            "F" == vpdchart.tempUnit ? i.noUiSlider.set(CtoF(t)) : i.noUiSlider.set(t)
        },
        buildShare: function() {
            "F" == vpdchart.tempUnit ? _("F", vpdchart.airRh, CtoF(vpdchart.airT), CtoF(vpdchart.leafT)) : _("C", vpdchart.airRh, vpdchart.airT, vpdchart.leafT),
            setTimeout((function() {
                let t = window.location.hash;
                $("a#share-twitter").attr("href", "https://twitter.com/intent/tweet?text=" + encodeURIComponent("I used @vpdchart to calculate the " + vpdchart.vpd + " kPa value of the VPD https://vpdchart.com/" + t)),
                $("a#share-reddit").attr("href", "https://www.reddit.com/submit?url=" + encodeURIComponent("https://vpdchart.com/" + t) + "&title=" + encodeURIComponent("Been using vpdchart.com to calculate VPD")),
                $("a#share-linkedin").attr("href", "https://www.linkedin.com/shareArticle/?url=" + encodeURIComponent("https://vpdchart.com/" + t)),
                $("a#share-email").attr("href", "mailto:?subject=" + encodeURIComponent("VPD chart") + "&body=" + encodeURIComponent("I've been using vpdchart.com to calculate VPD https://vpdchart.com/" + t)),
                $("#share-link").attr("value", "https://vpdchart.com/" + window.location.hash)
            }
            ), 20)
        },
        buildEmbed: function() {
            !function() {
                let t = $("#check-legend").prop("checked") ? 1 : 0
                  , e = vpdchart.airRh
                  , i = vpdchart.airT
                  , r = vpdchart.leafT
                  , a = vpdchart.tempUnit;
                "F" == a && (i = CtoF(i),
                r = CtoF(r));
                const o = '&lt;blockquote class="vpdchart" data-legend="' + t + '"&gt;For ' + e + "% air relative humidity, air temperature of " + i + " °" + a + " and leaf temperature of " + r + " °" + a + ', the calculated VPD value is &lt;a href="https://vpdchart.com/#' + [a, e, i, r, vpdchart.cropI].join(",") + '"&gt;' + vpdchart.vpd + ' kPa&lt;/a&gt; — &lt;a href="https://vpdchart.com/"&gt;vpdchart.com&lt;/a&gt;&lt;/blockquote&gt;&lt;script async src=&quot;https://vpdchart.com/widgets.js&quot;&gt;&lt;/script&gt;';
                $("#embedcode").html(o)
            }()
        },
        copyShareLink: function() {
            let t = document.querySelector("#share-link");
            t.select(),
            document.execCommand("copy"),
            $("#share-copy").html("COPIED"),
            window.setTimeout((function() {
                $("#share-copy").html("COPY"),
                "selectionStart"in t && (t.selectionEnd = t.selectionStart),
                t.blur()
            }
            ), 3e3)
        },
        copyEmbedCode: function() {
            let t = document.querySelector("#embedcode");
            t.select(),
            document.execCommand("copy"),
            $("#embed-copy").html("Copied"),
            window.setTimeout((function() {
                $("#embed-copy").html("Copy"),
                "selectionStart"in t && (t.selectionEnd = t.selectionStart),
                t.blur()
            }
            ), 3e3)
        },
        link: function(t) {
            !function(t) {
                if ($(".unlinked").addClass("d-none"),
                $(".linked").removeClass("d-none"),
                $("#slider_air_temp").addClass("nouislider-handle-primary"),
                $("#slider_leaf_temp").addClass("nouislider-handle-primary"),
                t && 1 === t)
                    try {
                        navigator.vibrate(30)
                    } catch (t) {}
                if (s = 1,
                vpdchart.tempLink = 1,
                u(),
                g(null, 1),
                0 === vpdchart.embed) {
                    let t = getSettings();
                    t.temp_link = 1,
                    localStorage.setItem("settings", JSON.stringify(t))
                }
            }(t)
        },
        unlink: function(t) {
            !function(t) {
                if ($(".linked").addClass("d-none"),
                $(".unlinked").removeClass("d-none"),
                $("#slider_air_temp").removeClass("nouislider-handle-primary"),
                $("#slider_leaf_temp").removeClass("nouislider-handle-primary"),
                t && 1 === t)
                    try {
                        navigator.vibrate(30)
                    } catch (t) {}
                if (s = 0,
                vpdchart.tempLink = 0,
                g(null, 0),
                0 === vpdchart.embed) {
                    let t = getSettings();
                    t.temp_link = 0,
                    localStorage.setItem("settings", JSON.stringify(t))
                }
            }(t)
        },
        sliderRhSetAttr: function(e, i) {
            "disabled" == e && 0 == i ? t.removeAttribute(e, i) : t.setAttribute(e, i)
        },
        sliderRhSetStep: function(e) {
            const i = {
                ...c
            };
            0 == e ? (i.step = null,
            i.format = wNumb({
                decimals: 4
            })) : (i.step = 1,
            i.format = wNumb({
                decimals: 0
            })),
            t.noUiSlider.updateOptions(i, !0)
        },
        sliderAirTempSetAttr: function(t, i) {
            "disabled" == t && 0 == i ? e.removeAttribute(t, i) : e.setAttribute(t, i)
        },
        sliderAirTempSetStep: function(t) {
            let i, r;
            "C" == vpdchart.tempUnit ? (i = {
                ...m
            },
            r = .5) : (i = {
                ...p
            },
            r = .9),
            0 == t ? (i.step = null,
            i.format = wNumb({
                decimals: 4
            })) : (i.step = r,
            i.format = wNumb({
                decimals: 1
            })),
            e.noUiSlider.updateOptions(i, !0)
        },
        sliderLeafTempSetAttr: function(t, e) {
            "disabled" == t && 0 == e ? i.removeAttribute(t, e) : i.setAttribute(t, e)
        },
        sliderLeafTempSetStep: function(t) {
            let e, r;
            "C" == vpdchart.tempUnit ? (e = {
                ...m
            },
            r = .5) : (e = {
                ...p
            },
            r = .9),
            0 == t ? (e.step = null,
            e.format = wNumb({
                decimals: 4
            })) : (e.step = r,
            e.format = wNumb({
                decimals: 1
            })),
            i.noUiSlider.updateOptions(e, !0)
        },
        setLocationHash: function(t, e, i, r) {
            _(t, e, i, r)
        },
        setLocationHashParse: function(t) {
            o = t
        },
        toggleVpdTargetState: function() {
            if (vpdchart.vpdTargetState = !vpdchart.vpdTargetState,
            vpdchart.vpdTargetState) {
                vpdchart._clearVpdTarget(),
                toastr.remove(),
                $("#btn-target").removeClass("btn-icon-dark btn-hover-icon-dark").addClass("btn-icon-primary btn-hover-icon-primary btn-light"),
                $("#btn-target").removeClass("btn-icon btn-circle").addClass("btn-pill btn-text-primary btn-hover-text-primary");
                const t = $("#btn-target-txt");
                !0 === isTouchDevice() && t.text("Tap chart"),
                t.show()
            } else
                $("#btn-target").removeClass("btn-icon-primary btn-hover-icon-primary btn-light").addClass("btn-icon-dark btn-hover-icon-dark"),
                $("#btn-target").removeClass("btn-pill btn-text-primary btn-hover-text-primary").addClass("btn-icon btn-circle"),
                $("#btn-target-txt").hide()
        }
    }
}()
  , VPDSettings = function() {
    let t, e, i, r, a = {}, o = 0, s = {}, n = function() {
        VPDFormControls.unlink(),
        $(".l-ul").hide(),
        $("#l-ul-d").removeClass("bg-x-2"),
        $("#l-ul-m").removeClass("m-t-link")
    }, l = function() {
        $(".l-ul").show(),
        $("#l-ul-d").addClass("bg-x-2"),
        $("#l-ul-m").addClass("m-t-link")
    }, h = function(r) {
        s[r] = 1,
        -1 !== t.indexOf(r) && $("#slider_rh_spin").removeClass("d-none"),
        -1 !== e.indexOf(r) && $("#slider_air_temp_spin").removeClass("d-none"),
        -1 !== i.indexOf(r) && $("#slider_leaf_temp_spin").removeClass("d-none");
        let a = $("#btn-refresh-d")
          , o = $("#btn-refresh-m");
        "0" == a.attr("data-refresh") && (a.attr("title", "Cancel"),
        a.attr("data-refresh", "1"),
        o.attr("data-refresh", "1"),
        KTUtil.btnWait(a[0], "ki ki-close", " "),
        KTUtil.btnWait(o[0], "ki ki-close", " Cancel"))
    }, d = function(r) {
        delete s[r],
        -1 !== t.indexOf(r) && $("#slider_rh_spin").addClass("d-none"),
        -1 !== e.indexOf(r) && $("#slider_air_temp_spin").addClass("d-none"),
        -1 !== i.indexOf(r) && $("#slider_leaf_temp_spin").addClass("d-none");
        let a = $("#btn-refresh-d")
          , o = $("#btn-refresh-m");
        s && 0 === Object.keys(s).length && s.constructor === Object && (a.attr("title", "Refresh"),
        a.attr("data-refresh", "0"),
        o.attr("data-refresh", "0"),
        KTUtil.btnRelease(a[0]),
        KTUtil.btnRelease(o[0]))
    }, c = function(a) {
        const o = getSensorData(a);
        let s;
        if (null != o) {
            let n = !1;
            if (-1 !== t.indexOf(a)) {
                s = t.split(".")[2],
                vpdchart.airRhRaw = Math.round(1e4 * o.values[s].value) / 1e4,
                $("#slider_rh_at").html("Raw data: " + o.values[s].value + "% @ " + formatDate(new Date(o.values[s].created_at))),
                n = !0,
                VPDFormControls.setRh(o.values[s].value)
            }
            if (-1 !== e.indexOf(a)) {
                s = e.split(".")[2];
                let t = o.values[s].value;
                vpdchart.airTRaw = t,
                "F" == vpdchart.tempUnit ? t = Math.round(1e4 * CtoF(t)) / 1e4 + " °F" : t += " °C",
                $("#slider_air_temp_at").html("Raw data: " + t + " @ " + formatDate(new Date(o.values[s].created_at))),
                n = !0,
                VPDFormControls.setAirTemp(o.values[s].value)
            }
            if (-1 !== i.indexOf(a)) {
                s = i.split(".")[2];
                let t = o.values[s].value;
                vpdchart.leafTRaw = t + parseFloat(r),
                "F" == vpdchart.tempUnit ? t = Math.round(1e4 * CtoF(t)) / 1e4 + " °F" : t += " °C",
                $("#slider_leaf_temp_at").html("Raw data: " + t + " @ " + formatDate(new Date(o.values[s].created_at))),
                n = !0,
                VPDFormControls.setLeafTemp(o.values[s].value + parseFloat(r))
            }
            !0 === n && ("F" == vpdchart.tempUnit ? VPDFormControls.setLocationHash("F", vpdchart.airRhRaw, CtoF(vpdchart.airTRaw), CtoF(vpdchart.leafTRaw)) : VPDFormControls.setLocationHash("C", vpdchart.airRhRaw, vpdchart.airTRaw, vpdchart.leafTRaw))
        }
    }, p = function() {
        $(".btn-refresh").show()
    }, m = function() {
        $(".btn-refresh").hide()
    };
    return {
        init: function() {
            let s = localStorage.getItem("sensors");
            s && (a = JSON.parse(s)),
            function() {
                if (vpdchart.log("VPDSettings.initSourceDropdowns"),
                Object.keys(a).length > 0) {
                    $("#air_rh_source option:last").remove(),
                    $("#air_temp_source option:last").remove(),
                    $("#leaf_temp_source option:last").remove();
                    for (const t in a)
                        if ("Govee" == a[t].brand || "Ruuvi" == a[t].brand || "SwitchBot" == a[t].brand)
                            $("#air_rh_source").append(new Option((a[t].alias ? a[t].alias : a[t].name) + " > Relative Humidity","ble." + t + ".rh")),
                            $("#air_temp_source").append(new Option((a[t].alias ? a[t].alias : a[t].name) + " > Temperature","ble." + t + ".temperature")),
                            $("#leaf_temp_source").append(new Option((a[t].alias ? a[t].alias : a[t].name) + " > Temperature","ble." + t + ".temperature"));
                        else if ("Pulse" == a[t].brand)
                            $("#air_rh_source").append(new Option(a[t].name + " > Relative Humidity","api." + t + ".rh")),
                            $("#air_temp_source").append(new Option(a[t].name + " > Temperature","api." + t + ".temperature")),
                            $("#leaf_temp_source").append(new Option(a[t].name + " > Temperature","api." + t + ".temperature"));
                        else {
                            let e = 0 === vpdchart.ha ? getSensorData(t) : null;
                            if (e)
                                for (const i in e.values)
                                    i in e.fields && -1 != e.fields[i].toLowerCase().indexOf("temp") && ($("#air_temp_source").append(new Option(e.channel_id + "(" + e.name + ") > " + e.fields[i],"api." + t + "." + i)),
                                    $("#leaf_temp_source").append(new Option(e.channel_id + "(" + e.name + ") > " + e.fields[i],"api." + t + "." + i))),
                                    i in e.fields && -1 != e.fields[i].toLowerCase().indexOf("hum") && $("#air_rh_source").append(new Option(e.channel_id + "(" + e.name + ") > " + e.fields[i],"api." + t + "." + i))
                        }
                }
                if (0 === vpdchart.embed) {
                    let s = getSettings();
                    for (const t in s)
                        ("crop" == t && 0 == vpdchart.cropInHash || "crop" != t) && $("#" + t).val(s[t]);
                    t = "air_rh_source"in s && "manual_input" != s.air_rh_source ? s.air_rh_source : "manual_input",
                    e = "air_temp_source"in s && "manual_input" != s.air_temp_source ? s.air_temp_source : "manual_input",
                    i = "leaf_temp_source"in s && "manual_input" != s.leaf_temp_source ? s.leaf_temp_source : "manual_input",
                    r = "leaf_temp_diff"in s ? s.leaf_temp_diff : 0;
                    let l = 1;
                    if ("manual_input" != t) {
                        const e = t.split(".")[1];
                        e in a && $("#slider_rh_sensor").html(" (" + (a[e].alias ? a[e].alias : a[e].name) + ")"),
                        VPDFormControls.sliderRhSetAttr("disabled", !0),
                        $("#slider_rh_at").removeClass("d-none"),
                        VPDFormControls.sliderRhSetStep(!1)
                    } else
                        $("#slider_rh_sensor").html(""),
                        VPDFormControls.sliderRhSetAttr("disabled", !1),
                        $("#slider_rh_at").addClass("d-none"),
                        VPDFormControls.sliderRhSetStep(!0);
                    if ("manual_input" != e) {
                        const t = e.split(".")[1];
                        t in a && $("#slider_air_temp_sensor").html(" (" + (a[t].alias ? a[t].alias : a[t].name) + ")"),
                        VPDFormControls.sliderAirTempSetAttr("disabled", !0),
                        $("#slider_air_temp_at").removeClass("d-none"),
                        VPDFormControls.sliderAirTempSetStep(!1)
                    } else
                        $("#slider_air_temp_sensor").html(""),
                        VPDFormControls.sliderAirTempSetAttr("disabled", !1),
                        $("#slider_air_temp_at").addClass("d-none"),
                        VPDFormControls.sliderAirTempSetStep(!0);
                    if ("manual_input" != i) {
                        const t = i.split(".")[1];
                        if (t in a && $("#slider_leaf_temp_sensor").html(" (" + (a[t].alias ? a[t].alias : a[t].name) + ")"),
                        VPDFormControls.sliderLeafTempSetAttr("disabled", !0),
                        0 === t.indexOf("pulse")) {
                            $("#leaf_temp_diff_wrp").hide();
                            let e = a[t].vpdLeafTempOffsetInF
                              , i = Math.round(100 * (FtoC(e + 32) - FtoC(32))) / 100;
                            i = (i < 0 ? "" : "+") + i,
                            e = (e < 0 ? "" : "+") + e,
                            $("#pulse_leaf_temp_diff").attr("data-tempc", i),
                            $("#pulse_leaf_temp_diff").attr("data-tempf", e),
                            "C" == vpdchart.tempUnit ? $("#pulse_leaf_temp_diff").text(i + " °C") : $("#pulse_leaf_temp_diff").text(e + " °F"),
                            $("#pulse_leaf_temp_diff_wrp").show(),
                            $("#pulse_leaf_temp_diff_helper").show()
                        } else
                            $("#pulse_leaf_temp_diff_wrp").hide(),
                            $("#pulse_leaf_temp_diff_helper").hide(),
                            $("#leaf_temp_diff_wrp").show();
                        $("#slider_leaf_temp_at").removeClass("d-none"),
                        VPDFormControls.sliderLeafTempSetStep(!1)
                    } else
                        $("#slider_leaf_temp_sensor").html(""),
                        VPDFormControls.sliderLeafTempSetAttr("disabled", !1),
                        $("#leaf_temp_diff_wrp").hide(),
                        $("#pulse_leaf_temp_diff_wrp").hide(),
                        $("#pulse_leaf_temp_diff_helper").hide(),
                        $("#slider_leaf_temp_at").addClass("d-none"),
                        VPDFormControls.sliderLeafTempSetStep(!0);
                    "manual_input" == e && "manual_input" == i || n();
                    let h = 0;
                    -1 === t.indexOf("ble") && -1 === e.indexOf("ble") && -1 === i.indexOf("ble") || (h = 1,
                    l = 0),
                    -1 === t.indexOf("api") && -1 === e.indexOf("api") && -1 === i.indexOf("api") || (h = 1),
                    1 == h ? (0 == o && (p(),
                    o = 1),
                    1 == l && 0 == $(".btn-refresh").attr("data-refresh") && VPDSettings.fetch()) : (m(),
                    o = 0)
                } else
                    m(),
                    o = 0;
                $(".save").change((function() {
                    if (0 === vpdchart.embed) {
                        let s, h = getSettings(), d = [];
                        h[$(this).attr("id")] = $(this).val(),
                        "crop"in h && vpdchart.setCrop(parseInt(h.crop)),
                        "air_rh_source"in h && "manual_input" != h.air_rh_source ? (t = h.air_rh_source,
                        s = t.split(".")[1],
                        d.includes(s) || d.push(s)) : t = "manual_input",
                        "air_temp_source"in h && "manual_input" != h.air_temp_source ? (e = h.air_temp_source,
                        s = e.split(".")[1],
                        d.includes(s) || d.push(s)) : e = "manual_input",
                        "leaf_temp_source"in h && "manual_input" != h.leaf_temp_source ? (i = h.leaf_temp_source,
                        s = i.split(".")[1],
                        d.includes(s) || d.push(s)) : i = "manual_input",
                        r = "leaf_temp_diff"in h ? h.leaf_temp_diff : "+0";
                        let c = 1;
                        if ("air_rh_source" == $(this).attr("id"))
                            "manual_input" != t ? (s = t.split(".")[1],
                            s in a && $("#slider_rh_sensor").html(" (" + (a[s].alias ? a[s].alias : a[s].name) + ")"),
                            VPDFormControls.sliderRhSetAttr("disabled", !0),
                            $("#slider_rh_at").removeClass("d-none"),
                            VPDFormControls.sliderRhSetStep(!1)) : ($("#slider_rh_sensor").html(""),
                            VPDFormControls.sliderRhSetAttr("disabled", !1),
                            $("#slider_rh_at").addClass("d-none"),
                            c = 0,
                            VPDFormControls.sliderRhSetStep(!0));
                        else if ("air_temp_source" == $(this).attr("id"))
                            "manual_input" != e ? (s = e.split(".")[1],
                            s in a && $("#slider_air_temp_sensor").html(" (" + (a[s].alias ? a[s].alias : a[s].name) + ")"),
                            VPDFormControls.sliderAirTempSetAttr("disabled", !0),
                            n(),
                            $("#slider_air_temp_at").removeClass("d-none"),
                            VPDFormControls.sliderAirTempSetStep(!1)) : ($("#slider_air_temp_sensor").html(""),
                            VPDFormControls.sliderAirTempSetAttr("disabled", !1),
                            "manual_input" == i && l(),
                            $("#slider_air_temp_at").addClass("d-none"),
                            c = 0,
                            VPDFormControls.sliderAirTempSetStep(!0));
                        else if ("leaf_temp_source" == $(this).attr("id"))
                            if ("manual_input" != i) {
                                if (s = i.split(".")[1],
                                s in a && $("#slider_leaf_temp_sensor").html(" (" + (a[s].alias ? a[s].alias : a[s].name) + ")"),
                                VPDFormControls.sliderLeafTempSetAttr("disabled", !0),
                                0 === s.indexOf("pulse")) {
                                    $("#leaf_temp_diff_wrp").hide(),
                                    $("#pulse_leaf_temp_diff_wrp").show();
                                    let t = a[s].vpdLeafTempOffsetInF
                                      , e = Math.round(1e4 * (FtoC(t + 32) - FtoC(32))) / 1e4;
                                    e = (e < 0 ? "" : "+") + e,
                                    t = (t < 0 ? "" : "+") + t,
                                    $("#pulse_leaf_temp_diff").attr("data-tempc", e),
                                    $("#pulse_leaf_temp_diff").attr("data-tempf", t),
                                    h.leaf_temp_diff = e,
                                    r = e,
                                    "C" == vpdchart.tempUnit ? $("#pulse_leaf_temp_diff").text(e + " °C") : $("#pulse_leaf_temp_diff").text(t + " °F"),
                                    $("#pulse_leaf_temp_diff_helper").show()
                                } else
                                    $("#pulse_leaf_temp_diff_wrp").hide(),
                                    $("#pulse_leaf_temp_diff_helper").hide(),
                                    $("#leaf_temp_diff_wrp").show(),
                                    h.leaf_temp_diff = "+0",
                                    r = "+0",
                                    $("#leaf_temp_diff").val(r);
                                n(),
                                $("#slider_leaf_temp_at").removeClass("d-none"),
                                VPDFormControls.sliderLeafTempSetStep(!1)
                            } else
                                $("#slider_leaf_temp_sensor").html(""),
                                VPDFormControls.sliderLeafTempSetAttr("disabled", !1),
                                $("#leaf_temp_diff_wrp").hide(),
                                $("#pulse_leaf_temp_diff_wrp").hide(),
                                $("#pulse_leaf_temp_diff_helper").hide(),
                                delete h.leaf_temp_diff,
                                "manual_input" == e && l(),
                                $("#slider_leaf_temp_at").addClass("d-none"),
                                c = 0,
                                VPDFormControls.sliderLeafTempSetStep(!0);
                        let u = 0;
                        -1 === t.indexOf("ble") && -1 === e.indexOf("ble") && -1 === i.indexOf("ble") || (u = 1,
                        c = 0),
                        -1 === t.indexOf("api") && -1 === e.indexOf("api") && -1 === i.indexOf("api") || (u = 1),
                        1 == u ? (0 == o && (p(),
                        o = 1),
                        1 == c && (1 == $(".btn-refresh").attr("data-refresh") && VPDSettings.cancelFetch(),
                        VPDSettings.fetch())) : (m(),
                        o = 0),
                        localStorage.setItem("settings", JSON.stringify(h))
                    } else {
                        let t = {};
                        t[$(this).attr("id")] = $(this).val(),
                        "crop"in t && vpdchart.setCrop(parseInt(t.crop))
                    }
                }
                ))
            }()
        },
        fetch: function() {
            !function() {
                let r, o = [], s = [];
                "manual_input" != t && (r = t.split(".")[1],
                !o.includes(r) && r in a && o.push(r));
                "manual_input" != e && (r = e.split(".")[1],
                !o.includes(r) && r in a && o.push(r));
                "manual_input" != i && (r = i.split(".")[1],
                !o.includes(r) && r in a && o.push(r));
                for (r of o)
                    -1 != r.indexOf("govee") || -1 != r.indexOf("ruuvi") || -1 != r.indexOf("switchbot") ? s.push(r) : -1 != r.indexOf("ubibot") ? (h(r),
                    ubibotFetchData(r).then((t => {
                        ubibotSaveData(t.id, t.json),
                        c(t.id),
                        d(t.id)
                    }
                    )).catch((t => {
                        d(t.id),
                        "TypeError: Failed to fetch" == t.error ? toastrNotif("Something's going wrong!", "Check your internet connection and try again.", "error") : toastrNotif("Something's going wrong!", t.error, "error")
                    }
                    ))) : -1 != r.indexOf("pulse") && (h(r),
                    pulseFetchData(r).then((t => {
                        pulseSaveData(t.id, t.json),
                        c(t.id),
                        d(t.id)
                    }
                    )).catch((t => {
                        d(t.id),
                        "TypeError: Failed to fetch" == t.error ? toastrNotif("Something's going wrong!", "Check your internet connection and try again.", "error") : toastrNotif("Something's going wrong!", t.error, "error")
                    }
                    )));
                s.length > 0 && bleFetchAndSaveData(s)
            }()
        },
        buildLegendHtml: function(t) {
            return function(t) {
                let e = '<h4 class="font-weight-bold" id="legend-title">' + t.name + '<button rel="tooltip-l" title="Change crop" class="btn btn-icon btn-sm btn-circle btn-icon-dark-75 btn-hover-light btn-hover-icon-dark ml-2" onclick="$(\'#kt_quick_panel_toggle\').trigger(\'click\');"><i class="ki ki-gear"></i></button></h4>';
                e += '<table class="table table-sm table-borderless table-legend"><tbody>',
                !1 !== t.dew && (e += '<tr><td><span class="badge dew">&nbsp;</span></td><td><span class="font-weight-bolder">Leaf Temp under Dew Point:</span> Danger Zone (Plant Disease)</td></tr>');
                for (let i = 0; i < t.intervals.length; i++)
                    !1 !== t.intervals[i].legend && (e += "<tr>",
                    e += '<td><span class="badge" style="background-color:' + t.intervals[i].color + ';">&nbsp;</span></td>',
                    e += '<td><span class="font-weight-bolder">',
                    void 0 === t.intervals[i].lower ? e += "VPD under " + t.intervals[i].upper : void 0 === t.intervals[i].upper ? e += "VPD over " + t.intervals[i].lower : (e += "VPD from " + t.intervals[i].lower + " to " + t.intervals[i].upper + " kPa",
                    t.intervals[i].temp_lower && t.intervals[i].temp_upper && (e += ", Air Temp from " + ("F" == vpdchart.tempUnit ? CtoF(t.intervals[i].temp_lower) : t.intervals[i].temp_lower) + " to " + ("F" == vpdchart.tempUnit ? CtoF(t.intervals[i].temp_upper) : t.intervals[i].temp_upper) + " °" + vpdchart.tempUnit)),
                    e += ":</span> " + t.intervals[i].name + "</td>",
                    e += "</tr>");
                return e += "</tbody></table>",
                e
            }(t)
        },
        cancelFetch: function() {
            !function() {
                for (const t in s)
                    0 !== t.indexOf("govee_") && 0 !== t.indexOf("ruuvi_") && 0 !== t.indexOf("switchbot_") || scan.stop();
                s = {};
                let t = $("#btn-refresh-d")
                  , e = $("#btn-refresh-m");
                t.attr("title", "Refresh"),
                t.attr("data-refresh", "0"),
                e.attr("data-refresh", "0"),
                KTUtil.btnRelease(t[0]),
                KTUtil.btnRelease(e[0]),
                $("#slider_rh_spin").addClass("d-none"),
                $("#slider_air_temp_spin").addClass("d-none"),
                $("#slider_leaf_temp_spin").addClass("d-none")
            }()
        },
        hideFetch: function(t) {
            d(t)
        },
        showFetch: function(t) {
            h(t)
        },
        updateSliderFromSensor: function(t) {
            c(t)
        }
    }
}();
jQuery(document).ready((function() {
    const t = $("#vpdchart")
      , e = {
        embed: "yes" == t.attr("data-embed") ? 1 : 0,
        ha: "yes" == t.attr("data-ha") ? 1 : 0
    };
    vpdchart = t.vpdChart(e),
    $(window).resize((function() {
        vpdchart.viewportWidth != getViewportWidth() && vpdchart.resize()
    }
    )),
    $(window).blur((function() {
        0 == e.ha && scan && scan.active && VPDSettings.cancelFetch()
    }
    )),
    VPDFormControls.init();
    const i = ["length", "stringify", "656409VvpjJm", "166604CLvJCF", "1QHoFWa", "1BrZaMn", "undefined", "fromCharCode", "3209044qDYyRz", "random", "209RPTTLu", "push", "toLowerCase", "1101139XQJQsZ", "3253tqDQEP", "indexOf", "774529simTbg", "log", "941496eUaFgY", "split"]
      , r = function(t, e) {
        return i[t -= 436]
    };
    (function(t, e) {
        const i = r;
        for (; ; )
            try {
                if (581952 === -parseInt(i(437)) - parseInt(i(452)) + -parseInt(i(449)) * -parseInt(i(453)) + parseInt(i(442)) + parseInt(i(444)) * -parseInt(i(455)) + -parseInt(i(441)) + -parseInt(i(443)) * -parseInt(i(447)))
                    break;
                t.push(t.shift())
            } catch (e) {
                t.push(t.shift())
            }
    }
    )(i),
    function() {
        const t = r;
        const e = String[t(446)](76, 79, 67, 65, 84, 73, 79, 78)[t(451)]()
          , i = String[t(446)](111, 114, 105, 103, 105, 110)[t(451)]()
          , a = window[e][i];
        if (a[t(454)](String.fromCharCode(108, 111, 99, 97, 108)) < 0) {
            for (var o, s, n, l, h, d, c = (n = t,
            l = ((o = a)[(s = t)(454)]("//") > -1 ? o[s(438)]("/")[2] : o[s(438)]("/")[0])[s(438)](":")[0][s(438)]("?")[0],
            h = l.split("."),
            2 == (d = h.length) ? l = h[0] : d > 2 && (l = h[d - 2],
            2 == h[d - 2].length && 2 == h[d - 1][n(439)] && (l = h[d - 3])),
            l), p = [118, 100, 104, 114], m = [], u = 0; u < 2 * p[t(439)]; )
                m[t(450)](c.charCodeAt(u)),
                u += 2;
            if (JSON[t(440)](m) === JSON.stringify(p))
                ;
            else {
                var f = 0;
                for (const e in window)
                    if (++f > 200)
                        try {
                            const i = Math.floor(100 * Math[t(448)]());
                            window[i] !== t(445) ? window[e] = window[i] : window[e] = null
                        } catch (t) {}
            }
        }
    }(),
    $(".unlinked").click((function() {
        VPDFormControls.link(1)
    }
    )),
    $(".linked").click((function() {
        VPDFormControls.unlink(1)
    }
    )),
    $(".btn-refresh").click((function() {
        0 == $(this).attr("data-refresh") ? VPDSettings.fetch() : VPDSettings.cancelFetch()
    }
    )),
    $("#shareModal").on("show.bs.modal", (function(t) {
        VPDFormControls.buildShare(),
        VPDFormControls.buildEmbed()
    }
    )),
    $("#check-legend").change((function() {
        VPDFormControls.buildEmbed()
    }
    )),
    $("#embedcode").click((function() {
        VPDFormControls.copyEmbedCode()
    }
    )),
    VPDSettings.init()
}
));
