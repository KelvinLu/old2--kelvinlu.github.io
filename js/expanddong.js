var ExpandDong = {};

(function(ExpandDong){

    var Panels = ExpandDong.Panels = function(container, options){
        // Load options
        this.options = {
            'expandRatio':  0.667,
            'resizeRatio':  0.1,
            'resizeTime':   10,
            'trigger':      'mouseover',
            'smallWidth':   700,
        }

        if ((options) && (options instanceof Object)) for (option in options) if (options.hasOwnProperty(option))
            this.options[option] = options[option];

        // Set active panel
        this._activePanelIndex = null;
        this._pristine = true;
        this._canActivatePanels = true;

        // Get list of panels and subelements
        panels = this._panels = [];

        for (var i = 0; i < container.children.length; i++) {
            if ((panelElem = container.children[i]).hasAttribute('panel-container')) {
                panelPreview = panelFull = null;

                for (var j = panelElem.children.length - 1; j >= 0; j--) {
                    panelChildElem = panelElem.children[j];

                    if (panelChildElem.hasAttribute('panel-preview')) {
                        panelPreview = panelChildElem;
                    } else if (panelChildElem.hasAttribute('panel-full')) {
                        panelFull = panelChildElem;
                    }
                };

                if ((panelPreview !== null) && (panelFull !== null)) {
                    // Create wrapper for contents
                    wrapper = document.createElement('div');
                    wrapper.style.position = 'relative';
                    wrapper.style.height = wrapper.style.width = '100%';

                    panelPreview.parentNode.removeChild(panelPreview);
                    panelFull.parentNode.removeChild(panelFull);

                    wrapper.appendChild(panelPreview);
                    wrapper.appendChild(panelFull);

                    panelElem.appendChild(wrapper);

                    panels.push({
                        'panel': panelElem, 
                        'preview': panelPreview, 
                        'full': panelFull, 
                    });
                }
            }
        };

        // Container properties
        this._container = container;
        containerWidth = this._containerWidth = this._container.clientWidth;
        eqWidth = this._eqWidth = (containerWidth - 1)/ panels.length;

        // Set width arrays
        this._currentWidths = Array.apply(null, Array(panels.length)).map(function(){ return eqWidth; });
        this._desiredWidths = this._currentWidths.slice();

        // Set starting CSS
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        // Bind listeners
        panelsContext = this;

        createActivator = function(index) {
            var index_container = {'index': index};

            return (function(){
                if (this._canActivatePanels)
                    this.activate(index_container.index);
            }).bind(panelsContext);
        };

        for (var i = panels.length - 1; i >= 0; i--) {
            panel = panels[i].panel;
            panel.addEventListener(this.options.trigger, createActivator(i));
        };

        window.addEventListener('resize', this._doResponsiveSizing.bind(this));

        // Initialize sizing
        this._doResponsiveSizing();
    };

    Panels.prototype._doResponsiveSizing = function() {
        this._containerWidth = this._container.clientWidth;

        if (window.innerWidth >= this.options.smallWidth) {
            this._setFullCSS();
            if (this._activePanelIndex !== null)
                this.activate(this._activePanelIndex);
            else
                this.deactivate();
            this._canActivatePanels = true;
        } else {
            this._setSmallCSS();
            this.deactivateSmall();
            this._canActivatePanels = false;
        }
    };

    Panels.prototype.activate = function(index){
        this._activePanelIndex = index;

        if ((index < 0) || (index >= this._panels.length)) return;
        activeWidth = (this._containerWidth - 1) * this.options.expandRatio;
        inactiveWidth = (this._containerWidth - 1 - activeWidth) / (this._panels.length - 1);
        this._desiredWidths = Array.apply(null, Array(this._panels.length)).map(function(){ return inactiveWidth; });
        this._desiredWidths[index] = activeWidth;

        for (var i = this._panels.length - 1; i >= 0; i--) {
            p = this._panels[i];
            p.preview.style.pointerEvents = 'auto';
            p.full.style.pointerEvents = 'none';
        };

        this._panels[index].preview.style.pointerEvents = 'none';
        this._panels[index].full.style.pointerEvents = 'auto';

        this._resize();
    };

    Panels.prototype.deactivate = function(){
        this._activePanelIndex = null;

        eqWidth = (this._containerWidth - 1) / this._panels.length;
        this._desiredWidths = Array.apply(null, Array(this._panels.length)).map(function(){ return eqWidth; });

        for (var i = this._panels.length - 1; i >= 0; i--) {
            p = this._panels[i];
            p.preview.style.pointerEvents = 'auto';
            p.full.style.pointerEvents = 'none';
            p.preview.style.opacity = '1';
            p.full.style.opacity = '0';
        };

        this._resize(reset = true);
    };

    Panels.prototype.deactivateSmall = function(){
        this._activePanelIndex = null;

        for (var i = this._panels.length - 1; i >= 0; i--) {
            p = this._panels[i];
            p.preview.style.pointerEvents = 'none';
            p.full.style.pointerEvents = 'auto';
            p.preview.style.opacity = '0';
            p.full.style.opacity = '1';
        };
    };

    Panels.prototype._resize = function(reset){
        // Fancy calculations
        currentWidths = this._currentWidths;
        differences = this._desiredWidths.map(function(d, d_i){ return d - currentWidths[d_i]; });

        resizeRatio = this.options.resizeRatio;
        growths = differences.map(function(d){ return (d > 0) ? (d * resizeRatio) : 0; });
        shrinks = differences.map(function(d){ return (d < 0) ? (d * resizeRatio) : 0; });

        sum_reduce = function(acc, cur){ return acc + cur; };
        abs_delta = growths.reduce(sum_reduce, 0) - shrinks.reduce(sum_reduce, 0);

        currentWidths = currentWidths.map(function(d, d_i){ return d + growths[d_i] + shrinks[d_i]; });

        // Handle overflow when sizing down window
        while (currentWidths.reduce(sum_reduce, 0) > this._containerWidth) {
            currentWidths = currentWidths.map(function(d, d_i){ return d + shrinks[d_i]; });
        }

        this._currentWidths = currentWidths;

        // Set panel...
        for (var i = this._currentWidths.length - 1; i >= 0; i--) {
            p = this._panels[i];

            // ... widths
            p.panel.style.width = this._currentWidths[i];

            // ... opacities
            opacity_delta = (growths[i] - shrinks[i]) / this._containerWidth * 100;
            if (i === this._activePanelIndex) {
                p.preview.style.opacity = Math.log(opacity_delta);
                p.full.style.opacity = 1 - Math.log(opacity_delta);
            } else if (this._pristine == false) {
                p.preview.style.opacity = 1 - Math.log(opacity_delta);
                p.full.style.opacity = Math.log(opacity_delta);           
            }
        }

        // Recursive event loop call
        if (abs_delta > 1) setTimeout(this._resize.bind(this), this.options.resizeTime);
        else {
            this._pristine = reset ? true : false;
        }
    };

    Panels.prototype._setFullCSS = function() {
        for (var i = this._panels.length - 1; i >= 0; i--) {
            // Sizing and positioning
            p = this._panels[i];
            p.panel.style.position = 'relative';
            p.panel.style.display = 'inline-block';
            p.panel.style.marginRight = '-4px';
            p.panel.style.height = '100%';
            p.panel.style.width = this._eqWidth;

            p.preview.style.position = p.full.style.position = "absolute";
            p.preview.style.top = p.preview.style.left = p.full.style.top = p.full.style.left = "0px";
            p.preview.style.height = p.preview.style.width = p.full.style.height = p.full.style.width = '100%';

            p.panel.style['box-sizing'] = p.preview.style['box-sizing'] = p.full.style['box-sizing'] = 'border-box';

            // Make all full divs transparent
            p.full.style.opacity = '0';
        };
    };

    Panels.prototype._setSmallCSS = function() {
        for (var i = this._panels.length - 1; i >= 0; i--) {
            // Sizing and positioning
            p = this._panels[i];
            p.panel.style.position = 'relative';
            p.panel.style.display = 'block';
            p.panel.style.marginRight = '0px';
            p.panel.style.height = 'auto';
            p.panel.style.width = '100%';

            p.preview.style.position = p.full.style.position = "absolute";
            p.preview.style.top = p.preview.style.left = p.full.style.top = p.full.style.left = "0px";
            p.preview.style.height = p.preview.style.width = p.full.style.height = p.full.style.width = '100%';

            p.panel.style['box-sizing'] = p.preview.style['box-sizing'] = p.full.style['box-sizing'] = 'border-box';

            // Make all preview divs transparent
            p.preview.style.opacity = '0';
        };
    };

})(ExpandDong);
