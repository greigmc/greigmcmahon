/*
 * jQuery FlexSlider v2.6.3
 * Copyright 2012 WooThemes
 * Contributing Author: Tyler Smith
 */
;
(function ($) {

  var focused = true;

  //FlexSlider: Object Instance
  $.flexslider = function(el, options) {
    var slider = $(el);

    // making variables public
    slider.vars = $.extend({}, $.flexslider.defaults, options);

    var namespace = slider.vars.namespace,
        msGesture = window.navigator && window.navigator.msPointerEnabled && window.MSGesture,
        touch = (( "ontouchstart" in window ) || msGesture || window.DocumentTouch && document instanceof DocumentTouch) && slider.vars.touch,
        // depricating this idea, as devices are being released with both of these events
        eventType = "click touchend MSPointerUp keyup",
        watchedEvent = "",
        watchedEventClearTimer,
        vertical = slider.vars.direction === "vertical",
        reverse = slider.vars.reverse,
        carousel = (slider.vars.itemWidth > 0),
        fade = slider.vars.animation === "fade",
        asNav = slider.vars.asNavFor !== "",
        methods = {};

    // Store a reference to the slider object
    $.data(el, "flexslider", slider);

    // Private slider methods
    methods = {
      init: function() {
        slider.animating = false;
        // Get current slide and make sure it is a number
        slider.currentSlide = parseInt( ( slider.vars.startAt ? slider.vars.startAt : 0), 10 );
        if ( isNaN( slider.currentSlide ) ) { slider.currentSlide = 0; }
        slider.animatingTo = slider.currentSlide;
        slider.atEnd = (slider.currentSlide === 0 || slider.currentSlide === slider.last);
        slider.containerSelector = slider.vars.selector.substr(0,slider.vars.selector.search(' '));
        slider.slides = $(slider.vars.selector, slider);
        slider.container = $(slider.containerSelector, slider);
        slider.count = slider.slides.length;
        // SYNC:
        slider.syncExists = $(slider.vars.sync).length > 0;
        // SLIDE:
        if (slider.vars.animation === "slide") { slider.vars.animation = "swing"; }
        slider.prop = (vertical) ? "top" : "marginLeft";
        slider.args = {};
        // SLIDESHOW:
        slider.manualPause = false;
        slider.stopped = false;
        //PAUSE WHEN INVISIBLE
        slider.started = false;
        slider.startTimeout = null;
        // TOUCH/USECSS:
        slider.transitions = !slider.vars.video && !fade && slider.vars.useCSS && (function() {
          var obj = document.createElement('div'),
              props = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
          for (var i in props) {
            if ( obj.style[ props[i] ] !== undefined ) {
              slider.pfx = props[i].replace('Perspective','').toLowerCase();
              slider.prop = "-" + slider.pfx + "-transform";
              return true;
            }
          }
          return false;
        }());
        slider.ensureAnimationEnd = '';
        // CONTROLSCONTAINER:
        if (slider.vars.controlsContainer !== "") slider.controlsContainer = $(slider.vars.controlsContainer).length > 0 && $(slider.vars.controlsContainer);
        // MANUAL:
        if (slider.vars.manualControls !== "") slider.manualControls = $(slider.vars.manualControls).length > 0 && $(slider.vars.manualControls);

        // CUSTOM DIRECTION NAV:
        if (slider.vars.customDirectionNav !== "") slider.customDirectionNav = $(slider.vars.customDirectionNav).length === 2 && $(slider.vars.customDirectionNav);

        // RANDOMIZE:
        if (slider.vars.randomize) {
          slider.slides.sort(function() { return (Math.round(Math.random())-0.5); });
          slider.container.empty().append(slider.slides);
        }

        slider.doMath();

        // INIT
        slider.setup("init");

        // CONTROLNAV:
        if (slider.vars.controlNav) { methods.controlNav.setup(); }

        // DIRECTIONNAV:
        if (slider.vars.directionNav) { methods.directionNav.setup(); }

        // KEYBOARD:
        if (slider.vars.keyboard && ($(slider.containerSelector).length === 1 || slider.vars.multipleKeyboard)) {
          $(document).bind('keyup', function(event) {
            var keycode = event.keyCode;
            if (!slider.animating && (keycode === 39 || keycode === 37)) {
              var target = (keycode === 39) ? slider.getTarget('next') :
                           (keycode === 37) ? slider.getTarget('prev') : false;
              slider.flexAnimate(target, slider.vars.pauseOnAction);
            }
          });
        }
        // MOUSEWHEEL:
        if (slider.vars.mousewheel) {
          slider.bind('mousewheel', function(event, delta, deltaX, deltaY) {
            event.preventDefault();
            var target = (delta < 0) ? slider.getTarget('next') : slider.getTarget('prev');
            slider.flexAnimate(target, slider.vars.pauseOnAction);
          });
        }

        // PAUSEPLAY
        if (slider.vars.pausePlay) { methods.pausePlay.setup(); }

        //PAUSE WHEN INVISIBLE
        if (slider.vars.slideshow && slider.vars.pauseInvisible) { methods.pauseInvisible.init(); }

        // SLIDSESHOW
        if (slider.vars.slideshow) {
          if (slider.vars.pauseOnHover) {
            slider.hover(function() {
              if (!slider.manualPlay && !slider.manualPause) { slider.pause(); }
            }, function() {
              if (!slider.manualPause && !slider.manualPlay && !slider.stopped) { slider.play(); }
            });
          }
          // initialize animation
          //If we're visible, or we don't use PageVisibility API
          if(!slider.vars.pauseInvisible || !methods.pauseInvisible.isHidden()) {
            (slider.vars.initDelay > 0) ? slider.startTimeout = setTimeout(slider.play, slider.vars.initDelay) : slider.play();
          }
        }

        // ASNAV:
        if (asNav) { methods.asNav.setup(); }

        // TOUCH
        if (touch && slider.vars.touch) { methods.touch(); }

        // FADE&&SMOOTHHEIGHT || SLIDE:
        if (!fade || (fade && slider.vars.smoothHeight)) { $(window).bind("resize orientationchange focus", methods.resize); }

        slider.find("img").attr("draggable", "false");

        // API: start() Callback
        setTimeout(function(){
          slider.vars.start(slider);
        }, 200);
      },
      asNav: {
        setup: function() {
          slider.asNav = true;
          slider.animatingTo = Math.floor(slider.currentSlide/slider.move);
          slider.currentItem = slider.currentSlide;
          slider.slides.removeClass(namespace + "active-slide").eq(slider.currentItem).addClass(namespace + "active-slide");
          if(!msGesture){
              slider.slides.on(eventType, function(e){
                e.preventDefault();
                var $slide = $(this),
                    target = $slide.index();
                var posFromLeft = $slide.offset().left - $(slider).scrollLeft(); // Find position of slide relative to left of slider container
                if( posFromLeft <= 0 && $slide.hasClass( namespace + 'active-slide' ) ) {
                  slider.flexAnimate(slider.getTarget("prev"), true);
                } else if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass(namespace + "active-slide")) {
                  slider.direction = (slider.currentItem < target) ? "next" : "prev";
                  slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
                }
              });
          }else{
              el._slider = slider;
              slider.slides.each(function (){
                  var that = this;
                  that._gesture = new MSGesture();
                  that._gesture.target = that;
                  that.addEventListener("MSPointerDown", function (e){
                      e.preventDefault();
                      if(e.currentTarget._gesture) {
                        e.currentTarget._gesture.addPointer(e.pointerId);
                      }
                  }, false);
                  that.addEventListener("MSGestureTap", function (e){
                      e.preventDefault();
                      var $slide = $(this),
                          target = $slide.index();
                      if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass('active')) {
                          slider.direction = (slider.currentItem < target) ? "next" : "prev";
                          slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
                      }
                  });
              });
          }
        }
      },
      controlNav: {
        setup: function() {
          if (!slider.manualControls) {
            methods.controlNav.setupPaging();
          } else { // MANUALCONTROLS:
            methods.controlNav.setupManual();
          }
        },
        setupPaging: function() {
          var type = (slider.vars.controlNav === "thumbnails") ? 'control-thumbs' : 'control-paging',
              j = 1,
              item,
              slide;

          slider.controlNavScaffold = $('<ol class="'+ namespace + 'control-nav ' + namespace + type + '"></ol>');

          if (slider.pagingCount > 1) {
            for (var i = 0; i < slider.pagingCount; i++) {
              slide = slider.slides.eq(i);
              if ( undefined === slide.attr( 'data-thumb-alt' ) ) { slide.attr( 'data-thumb-alt', '' ); }
              var altText = ( '' !== slide.attr( 'data-thumb-alt' ) ) ? altText = ' alt="' + slide.attr( 'data-thumb-alt' ) + '"' : '';
              item = (slider.vars.controlNav === "thumbnails") ? '<img src="' + slide.attr( 'data-thumb' ) + '"' + altText + '/>' : '<a href="#">' + j + '</a>';
              if ( 'thumbnails' === slider.vars.controlNav && true === slider.vars.thumbCaptions ) {
                var captn = slide.attr( 'data-thumbcaption' );
                if ( '' !== captn && undefined !== captn ) { item += '<span class="' + namespace + 'caption">' + captn + '</span>'; }
              }
              slider.controlNavScaffold.append('<li>' + item + '</li>');
              j++;
            }
          }

          // CONTROLSCONTAINER:
          (slider.controlsContainer) ? $(slider.controlsContainer).append(slider.controlNavScaffold) : slider.append(slider.controlNavScaffold);
          methods.controlNav.set();

          methods.controlNav.active();

          slider.controlNavScaffold.delegate('a, img', eventType, function(event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              var $this = $(this),
                  target = slider.controlNav.index($this);

              if (!$this.hasClass(namespace + 'active')) {
                slider.direction = (target > slider.currentSlide) ? "next" : "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              }
            }

            // setup flags to prevent event duplication
            if (watchedEvent === "") {
              watchedEvent = event.type;
            }
            methods.setToClearWatchedEvent();

          });
        },
        setupManual: function() {
          slider.controlNav = slider.manualControls;
          methods.controlNav.active();

          slider.controlNav.bind(eventType, function(event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              var $this = $(this),
                  target = slider.controlNav.index($this);

              if (!$this.hasClass(namespace + 'active')) {
                (target > slider.currentSlide) ? slider.direction = "next" : slider.direction = "prev";
                slider.flexAnimate(target, slider.vars.pauseOnAction);
              }
            }

            // setup flags to prevent event duplication
            if (watchedEvent === "") {
              watchedEvent = event.type;
            }
            methods.setToClearWatchedEvent();
          });
        },
        set: function() {
          var selector = (slider.vars.controlNav === "thumbnails") ? 'img' : 'a';
          slider.controlNav = $('.' + namespace + 'control-nav li ' + selector, (slider.controlsContainer) ? slider.controlsContainer : slider);
        },
        active: function() {
          slider.controlNav.removeClass(namespace + "active").eq(slider.animatingTo).addClass(namespace + "active");
        },
        update: function(action, pos) {
          if (slider.pagingCount > 1 && action === "add") {
            slider.controlNavScaffold.append($('<li><a href="#">' + slider.count + '</a></li>'));
          } else if (slider.pagingCount === 1) {
            slider.controlNavScaffold.find('li').remove();
          } else {
            slider.controlNav.eq(pos).closest('li').remove();
          }
          methods.controlNav.set();
          (slider.pagingCount > 1 && slider.pagingCount !== slider.controlNav.length) ? slider.update(pos, action) : methods.controlNav.active();
        }
      },
      directionNav: {
        setup: function() {
          var directionNavScaffold = $('<ul class="' + namespace + 'direction-nav"><li class="' + namespace + 'nav-prev"><a class="' + namespace + 'prev" href="#">' + slider.vars.prevText + '</a></li><li class="' + namespace + 'nav-next"><a class="' + namespace + 'next" href="#">' + slider.vars.nextText + '</a></li></ul>');

          // CUSTOM DIRECTION NAV:
          if (slider.customDirectionNav) {
            slider.directionNav = slider.customDirectionNav;
          // CONTROLSCONTAINER:
          } else if (slider.controlsContainer) {
            $(slider.controlsContainer).append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider.controlsContainer);
          } else {
            slider.append(directionNavScaffold);
            slider.directionNav = $('.' + namespace + 'direction-nav li a', slider);
          }

          methods.directionNav.update();

          slider.directionNav.bind(eventType, function(event) {
            event.preventDefault();
            var target;

            if (watchedEvent === "" || watchedEvent === event.type) {
              target = ($(this).hasClass(namespace + 'next')) ? slider.getTarget('next') : slider.getTarget('prev');
              slider.flexAnimate(target, slider.vars.pauseOnAction);
            }

            // setup flags to prevent event duplication
            if (watchedEvent === "") {
              watchedEvent = event.type;
            }
            methods.setToClearWatchedEvent();
          });
        },
        update: function() {
          var disabledClass = namespace + 'disabled';
          if (slider.pagingCount === 1) {
            slider.directionNav.addClass(disabledClass).attr('tabindex', '-1');
          } else if (!slider.vars.animationLoop) {
            if (slider.animatingTo === 0) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "prev").addClass(disabledClass).attr('tabindex', '-1');
            } else if (slider.animatingTo === slider.last) {
              slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "next").addClass(disabledClass).attr('tabindex', '-1');
            } else {
              slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
            }
          } else {
            slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
          }
        }
      },
      pausePlay: {
        setup: function() {
          var pausePlayScaffold = $('<div class="' + namespace + 'pauseplay"><a href="#"></a></div>');

          // CONTROLSCONTAINER:
          if (slider.controlsContainer) {
            slider.controlsContainer.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider.controlsContainer);
          } else {
            slider.append(pausePlayScaffold);
            slider.pausePlay = $('.' + namespace + 'pauseplay a', slider);
          }

          methods.pausePlay.update((slider.vars.slideshow) ? namespace + 'pause' : namespace + 'play');

          slider.pausePlay.bind(eventType, function(event) {
            event.preventDefault();

            if (watchedEvent === "" || watchedEvent === event.type) {
              if ($(this).hasClass(namespace + 'pause')) {
                slider.manualPause = true;
                slider.manualPlay = false;
                slider.pause();
              } else {
                slider.manualPause = false;
                slider.manualPlay = true;
                slider.play();
              }
            }

            // setup flags to prevent event duplication
            if (watchedEvent === "") {
              watchedEvent = event.type;
            }
            methods.setToClearWatchedEvent();
          });
        },
        update: function(state) {
          (state === "play") ? slider.pausePlay.removeClass(namespace + 'pause').addClass(namespace + 'play').html(slider.vars.playText) : slider.pausePlay.removeClass(namespace + 'play').addClass(namespace + 'pause').html(slider.vars.pauseText);
        }
      },
      touch: function() {
        var startX,
          startY,
          offset,
          cwidth,
          dx,
          startT,
          onTouchStart,
          onTouchMove,
          onTouchEnd,
          scrolling = false,
          localX = 0,
          localY = 0,
          accDx = 0;

        if(!msGesture){
            onTouchStart = function(e) {
              if (slider.animating) {
                e.preventDefault();
              } else if ( ( window.navigator.msPointerEnabled ) || e.touches.length === 1 ) {
                slider.pause();
                // CAROUSEL:
                cwidth = (vertical) ? slider.h : slider. w;
                startT = Number(new Date());
                // CAROUSEL:

                // Local vars for X and Y points.
                localX = e.touches[0].pageX;
                localY = e.touches[0].pageY;

                offset = (carousel && reverse && slider.animatingTo === slider.last) ? 0 :
                         (carousel && reverse) ? slider.limit - (((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo) :
                         (carousel && slider.currentSlide === slider.last) ? slider.limit :
                         (carousel) ? ((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.currentSlide :
                         (reverse) ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
                startX = (vertical) ? localY : localX;
                startY = (vertical) ? localX : localY;

                el.addEventListener('touchmove', onTouchMove, false);
                el.addEventListener('touchend', onTouchEnd, false);
              }
            };

            onTouchMove = function(e) {
              // Local vars for X and Y points.

              localX = e.touches[0].pageX;
              localY = e.touches[0].pageY;

              dx = (vertical) ? startX - localY : startX - localX;
              scrolling = (vertical) ? (Math.abs(dx) < Math.abs(localX - startY)) : (Math.abs(dx) < Math.abs(localY - startY));

              var fxms = 500;

              if ( ! scrolling || Number( new Date() ) - startT > fxms ) {
                e.preventDefault();
                if (!fade && slider.transitions) {
                  if (!slider.vars.animationLoop) {
                    dx = dx/((slider.currentSlide === 0 && dx < 0 || slider.currentSlide === slider.last && dx > 0) ? (Math.abs(dx)/cwidth+2) : 1);
                  }
                  slider.setProps(offset + dx, "setTouch");
                }
              }
            };

            onTouchEnd = function(e) {
              // finish the touch by undoing the touch session
              el.removeEventListener('touchmove', onTouchMove, false);

              if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
                var updateDx = (reverse) ? -dx : dx,
                    target = (updateDx > 0) ? slider.getTarget('next') : slider.getTarget('prev');

                if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth/2)) {
                  slider.flexAnimate(target, slider.vars.pauseOnAction);
                } else {
                  if (!fade) { slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true); }
                }
              }
              el.removeEventListener('touchend', onTouchEnd, false);

              startX = null;
              startY = null;
              dx = null;
              offset = null;
            };

            el.addEventListener('touchstart', onTouchStart, false);
        }else{
            el.style.msTouchAction = "none";
            el._gesture = new MSGesture();
            el._gesture.target = el;
            el.addEventListener("MSPointerDown", onMSPointerDown, false);
            el._slider = slider;
            el.addEventListener("MSGestureChange", onMSGestureChange, false);
            el.addEventListener("MSGestureEnd", onMSGestureEnd, false);

            function onMSPointerDown(e){
                e.stopPropagation();
                if (slider.animating) {
                    e.preventDefault();
                }else{
                    slider.pause();
                    el._gesture.addPointer(e.pointerId);
                    accDx = 0;
                    cwidth = (vertical) ? slider.h : slider. w;
                    startT = Number(new Date());
                    // CAROUSEL:

                    offset = (carousel && reverse && slider.animatingTo === slider.last) ? 0 :
                        (carousel && reverse) ? slider.limit - (((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo) :
                            (carousel && slider.currentSlide === slider.last) ? slider.limit :
                                (carousel) ? ((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.currentSlide :
                                    (reverse) ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
                }
            }

            function onMSGestureChange(e) {
                e.stopPropagation();
                var slider = e.target._slider;
                if(!slider){
                    return;
                }
                var transX = -e.translationX,
                    transY = -e.translationY;

                //Accumulate translations.
                accDx = accDx + ((vertical) ? transY : transX);
                dx = accDx;
                scrolling = (vertical) ? (Math.abs(accDx) < Math.abs(-transX)) : (Math.abs(accDx) < Math.abs(-transY));

                if(e.detail === e.MSGESTURE_FLAG_INERTIA){
                    setImmediate(function (){
                        el._gesture.stop();
                    });

                    return;
                }

                if (!scrolling || Number(new Date()) - startT > 500) {
                    e.preventDefault();
                    if (!fade && slider.transitions) {
                        if (!slider.vars.animationLoop) {
                            dx = accDx / ((slider.currentSlide === 0 && accDx < 0 || slider.currentSlide === slider.last && accDx > 0) ? (Math.abs(accDx) / cwidth + 2) : 1);
                        }
                        slider.setProps(offset + dx, "setTouch");
                    }
                }
            }

            function onMSGestureEnd(e) {
                e.stopPropagation();
                var slider = e.target._slider;
                if(!slider){
                    return;
                }
                if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
                    var updateDx = (reverse) ? -dx : dx,
                        target = (updateDx > 0) ? slider.getTarget('next') : slider.getTarget('prev');

                    if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth/2)) {
                        slider.flexAnimate(target, slider.vars.pauseOnAction);
                    } else {
                        if (!fade) { slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true); }
                    }
                }

                startX = null;
                startY = null;
                dx = null;
                offset = null;
                accDx = 0;
            }
        }
      },
      resize: function() {
        if (!slider.animating && slider.is(':visible')) {
          if (!carousel) { slider.doMath(); }

          if (fade) {
            // SMOOTH HEIGHT:
            methods.smoothHeight();
          } else if (carousel) { //CAROUSEL:
            slider.slides.width(slider.computedW);
            slider.update(slider.pagingCount);
            slider.setProps();
          }
          else if (vertical) { //VERTICAL:
            slider.viewport.height(slider.h);
            slider.setProps(slider.h, "setTotal");
          } else {
            // SMOOTH HEIGHT:
            if (slider.vars.smoothHeight) { methods.smoothHeight(); }
            slider.newSlides.width(slider.computedW);
            slider.setProps(slider.computedW, "setTotal");
          }
        }
      },
      smoothHeight: function(dur) {
        if (!vertical || fade) {
          var $obj = (fade) ? slider : slider.viewport;
          (dur) ? $obj.animate({"height": slider.slides.eq(slider.animatingTo).innerHeight()}, dur) : $obj.innerHeight(slider.slides.eq(slider.animatingTo).innerHeight());
        }
      },
      sync: function(action) {
        var $obj = $(slider.vars.sync).data("flexslider"),
            target = slider.animatingTo;

        switch (action) {
          case "animate": $obj.flexAnimate(target, slider.vars.pauseOnAction, false, true); break;
          case "play": if (!$obj.playing && !$obj.asNav) { $obj.play(); } break;
          case "pause": $obj.pause(); break;
        }
      },
      uniqueID: function($clone) {
        // Append _clone to current level and children elements with id attributes
        $clone.filter( '[id]' ).add($clone.find( '[id]' )).each(function() {
          var $this = $(this);
          $this.attr( 'id', $this.attr( 'id' ) + '_clone' );
        });
        return $clone;
      },
      pauseInvisible: {
        visProp: null,
        init: function() {
          var visProp = methods.pauseInvisible.getHiddenProp();
          if (visProp) {
            var evtname = visProp.replace(/[H|h]idden/,'') + 'visibilitychange';
            document.addEventListener(evtname, function() {
              if (methods.pauseInvisible.isHidden()) {
                if(slider.startTimeout) {
                  clearTimeout(slider.startTimeout); //If clock is ticking, stop timer and prevent from starting while invisible
                } else {
                  slider.pause(); //Or just pause
                }
              }
              else {
                if(slider.started) {
                  slider.play(); //Initiated before, just play
                } else {
                  if (slider.vars.initDelay > 0) {
                    setTimeout(slider.play, slider.vars.initDelay);
                  } else {
                    slider.play(); //Didn't init before: simply init or wait for it
                  }
                }
              }
            });
          }
        },
        isHidden: function() {
          var prop = methods.pauseInvisible.getHiddenProp();
          if (!prop) {
            return false;
          }
          return document[prop];
        },
        getHiddenProp: function() {
          var prefixes = ['webkit','moz','ms','o'];
          // if 'hidden' is natively supported just return it
          if ('hidden' in document) {
            return 'hidden';
          }
          // otherwise loop over all the known prefixes until we find one
          for ( var i = 0; i < prefixes.length; i++ ) {
              if ((prefixes[i] + 'Hidden') in document) {
                return prefixes[i] + 'Hidden';
              }
          }
          // otherwise it's not supported
          return null;
        }
      },
      setToClearWatchedEvent: function() {
        clearTimeout(watchedEventClearTimer);
        watchedEventClearTimer = setTimeout(function() {
          watchedEvent = "";
        }, 3000);
      }
    };

    // public methods
    slider.flexAnimate = function(target, pause, override, withSync, fromNav) {
      if (!slider.vars.animationLoop && target !== slider.currentSlide) {
        slider.direction = (target > slider.currentSlide) ? "next" : "prev";
      }

      if (asNav && slider.pagingCount === 1) slider.direction = (slider.currentItem < target) ? "next" : "prev";

      if (!slider.animating && (slider.canAdvance(target, fromNav) || override) && slider.is(":visible")) {
        if (asNav && withSync) {
          var master = $(slider.vars.asNavFor).data('flexslider');
          slider.atEnd = target === 0 || target === slider.count - 1;
          master.flexAnimate(target, true, false, true, fromNav);
          slider.direction = (slider.currentItem < target) ? "next" : "prev";
          master.direction = slider.direction;

          if (Math.ceil((target + 1)/slider.visible) - 1 !== slider.currentSlide && target !== 0) {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            target = Math.floor(target/slider.visible);
          } else {
            slider.currentItem = target;
            slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
            return false;
          }
        }

        slider.animating = true;
        slider.animatingTo = target;

        // SLIDESHOW:
        if (pause) { slider.pause(); }

        // API: before() animation Callback
        slider.vars.before(slider);

        // SYNC:
        if (slider.syncExists && !fromNav) { methods.sync("animate"); }

        // CONTROLNAV
        if (slider.vars.controlNav) { methods.controlNav.active(); }

        // !CAROUSEL:
        // CANDIDATE: slide active class (for add/remove slide)
        if (!carousel) { slider.slides.removeClass(namespace + 'active-slide').eq(target).addClass(namespace + 'active-slide'); }

        // INFINITE LOOP:
        // CANDIDATE: atEnd
        slider.atEnd = target === 0 || target === slider.last;

        // DIRECTIONNAV:
        if (slider.vars.directionNav) { methods.directionNav.update(); }

        if (target === slider.last) {
          // API: end() of cycle Callback
          slider.vars.end(slider);
          // SLIDESHOW && !INFINITE LOOP:
          if (!slider.vars.animationLoop) { slider.pause(); }
        }

        // SLIDE:
        if (!fade) {
          var dimension = (vertical) ? slider.slides.filter(':first').height() : slider.computedW,
              margin, slideString, calcNext;

          // INFINITE LOOP / REVERSE:
          if (carousel) {
            margin = slider.vars.itemMargin;
            calcNext = ((slider.itemW + margin) * slider.move) * slider.animatingTo;
            slideString = (calcNext > slider.limit && slider.visible !== 1) ? slider.limit : calcNext;
          } else if (slider.currentSlide === 0 && target === slider.count - 1 && slider.vars.animationLoop && slider.direction !== "next") {
            slideString = (reverse) ? (slider.count + slider.cloneOffset) * dimension : 0;
          } else if (slider.currentSlide === slider.last && target === 0 && slider.vars.animationLoop && slider.direction !== "prev") {
            slideString = (reverse) ? 0 : (slider.count + 1) * dimension;
          } else {
            slideString = (reverse) ? ((slider.count - 1) - target + slider.cloneOffset) * dimension : (target + slider.cloneOffset) * dimension;
          }
          slider.setProps(slideString, "", slider.vars.animationSpeed);
          if (slider.transitions) {
            if (!slider.vars.animationLoop || !slider.atEnd) {
              slider.animating = false;
              slider.currentSlide = slider.animatingTo;
            }

            // Unbind previous transitionEnd events and re-bind new transitionEnd event
            slider.container.unbind("webkitTransitionEnd transitionend");
            slider.container.bind("webkitTransitionEnd transitionend", function() {
              clearTimeout(slider.ensureAnimationEnd);
              slider.wrapup(dimension);
            });

            // Insurance for the ever-so-fickle transitionEnd event
            clearTimeout(slider.ensureAnimationEnd);
            slider.ensureAnimationEnd = setTimeout(function() {
              slider.wrapup(dimension);
            }, slider.vars.animationSpeed + 100);

          } else {
            slider.container.animate(slider.args, slider.vars.animationSpeed, slider.vars.easing, function(){
              slider.wrapup(dimension);
            });
          }
        } else { // FADE:
          if (!touch) {
            slider.slides.eq(slider.currentSlide).css({"zIndex": 1}).animate({"opacity": 0}, slider.vars.animationSpeed, slider.vars.easing);
            slider.slides.eq(target).css({"zIndex": 2}).animate({"opacity": 1}, slider.vars.animationSpeed, slider.vars.easing, slider.wrapup);
          } else {
            slider.slides.eq(slider.currentSlide).css({ "opacity": 0, "zIndex": 1 });
            slider.slides.eq(target).css({ "opacity": 1, "zIndex": 2 });
            slider.wrapup(dimension);
          }
        }
        // SMOOTH HEIGHT:
        if (slider.vars.smoothHeight) { methods.smoothHeight(slider.vars.animationSpeed); }
      }
    };
    slider.wrapup = function(dimension) {
      // SLIDE:
      if (!fade && !carousel) {
        if (slider.currentSlide === 0 && slider.animatingTo === slider.last && slider.vars.animationLoop) {
          slider.setProps(dimension, "jumpEnd");
        } else if (slider.currentSlide === slider.last && slider.animatingTo === 0 && slider.vars.animationLoop) {
          slider.setProps(dimension, "jumpStart");
        }
      }
      slider.animating = false;
      slider.currentSlide = slider.animatingTo;
      // API: after() animation Callback
      slider.vars.after(slider);
    };

    // SLIDESHOW:
    slider.animateSlides = function() {
      if (!slider.animating && focused ) { slider.flexAnimate(slider.getTarget("next")); }
    };
    // SLIDESHOW:
    slider.pause = function() {
      clearInterval(slider.animatedSlides);
      slider.animatedSlides = null;
      slider.playing = false;
      // PAUSEPLAY:
      if (slider.vars.pausePlay) { methods.pausePlay.update("play"); }
      // SYNC:
      if (slider.syncExists) { methods.sync("pause"); }
    };
    // SLIDESHOW:
    slider.play = function() {
      if (slider.playing) { clearInterval(slider.animatedSlides); }
      slider.animatedSlides = slider.animatedSlides || setInterval(slider.animateSlides, slider.vars.slideshowSpeed);
      slider.started = slider.playing = true;
      // PAUSEPLAY:
      if (slider.vars.pausePlay) { methods.pausePlay.update("pause"); }
      // SYNC:
      if (slider.syncExists) { methods.sync("play"); }
    };
    // STOP:
    slider.stop = function () {
      slider.pause();
      slider.stopped = true;
    };
    slider.canAdvance = function(target, fromNav) {
      // ASNAV:
      var last = (asNav) ? slider.pagingCount - 1 : slider.last;
      return (fromNav) ? true :
             (asNav && slider.currentItem === slider.count - 1 && target === 0 && slider.direction === "prev") ? true :
             (asNav && slider.currentItem === 0 && target === slider.pagingCount - 1 && slider.direction !== "next") ? false :
             (target === slider.currentSlide && !asNav) ? false :
             (slider.vars.animationLoop) ? true :
             (slider.atEnd && slider.currentSlide === 0 && target === last && slider.direction !== "next") ? false :
             (slider.atEnd && slider.currentSlide === last && target === 0 && slider.direction === "next") ? false :
             true;
    };
    slider.getTarget = function(dir) {
      slider.direction = dir;
      if (dir === "next") {
        return (slider.currentSlide === slider.last) ? 0 : slider.currentSlide + 1;
      } else {
        return (slider.currentSlide === 0) ? slider.last : slider.currentSlide - 1;
      }
    };

    // SLIDE:
    slider.setProps = function(pos, special, dur) {
      var target = (function() {
        var posCheck = (pos) ? pos : ((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo,
            posCalc = (function() {
              if (carousel) {
                return (special === "setTouch") ? pos :
                       (reverse && slider.animatingTo === slider.last) ? 0 :
                       (reverse) ? slider.limit - (((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo) :
                       (slider.animatingTo === slider.last) ? slider.limit : posCheck;
              } else {
                switch (special) {
                  case "setTotal": return (reverse) ? ((slider.count - 1) - slider.currentSlide + slider.cloneOffset) * pos : (slider.currentSlide + slider.cloneOffset) * pos;
                  case "setTouch": return (reverse) ? pos : pos;
                  case "jumpEnd": return (reverse) ? pos : slider.count * pos;
                  case "jumpStart": return (reverse) ? slider.count * pos : pos;
                  default: return pos;
                }
              }
            }());

            return (posCalc * -1) + "px";
          }());

      if (slider.transitions) {
        target = (vertical) ? "translate3d(0," + target + ",0)" : "translate3d(" + target + ",0,0)";
        dur = (dur !== undefined) ? (dur/1000) + "s" : "0s";
        slider.container.css("-" + slider.pfx + "-transition-duration", dur);
         slider.container.css("transition-duration", dur);
      }

      slider.args[slider.prop] = target;
      if (slider.transitions || dur === undefined) { slider.container.css(slider.args); }

      slider.container.css('transform',target);
    };

    slider.setup = function(type) {
      // SLIDE:
      if (!fade) {
        var sliderOffset, arr;

        if (type === "init") {
          slider.viewport = $('<div class="' + namespace + 'viewport"></div>').css({"overflow": "hidden", "position": "relative"}).appendTo(slider).append(slider.container);
          // INFINITE LOOP:
          slider.cloneCount = 0;
          slider.cloneOffset = 0;
          // REVERSE:
          if (reverse) {
            arr = $.makeArray(slider.slides).reverse();
            slider.slides = $(arr);
            slider.container.empty().append(slider.slides);
          }
        }
        // INFINITE LOOP && !CAROUSEL:
        if (slider.vars.animationLoop && !carousel) {
          slider.cloneCount = 2;
          slider.cloneOffset = 1;
          // clear out old clones
          if (type !== "init") { slider.container.find('.clone').remove(); }
          slider.container.append(methods.uniqueID(slider.slides.first().clone().addClass('clone')).attr('aria-hidden', 'true'))
                          .prepend(methods.uniqueID(slider.slides.last().clone().addClass('clone')).attr('aria-hidden', 'true'));
        }
        slider.newSlides = $(slider.vars.selector, slider);

        sliderOffset = (reverse) ? slider.count - 1 - slider.currentSlide + slider.cloneOffset : slider.currentSlide + slider.cloneOffset;
        // VERTICAL:
        if (vertical && !carousel) {
          slider.container.height((slider.count + slider.cloneCount) * 200 + "%").css("position", "absolute").width("100%");
          setTimeout(function(){
            slider.newSlides.css({"display": "block"});
            slider.doMath();
            slider.viewport.height(slider.h);
            slider.setProps(sliderOffset * slider.h, "init");
          }, (type === "init") ? 100 : 0);
        } else {
          slider.container.width((slider.count + slider.cloneCount) * 200 + "%");
          slider.setProps(sliderOffset * slider.computedW, "init");
          setTimeout(function(){
            slider.doMath();
            slider.newSlides.css({"width": slider.computedW, "marginRight" : slider.computedM, "float": "left", "display": "block"});
            // SMOOTH HEIGHT:
            if (slider.vars.smoothHeight) { methods.smoothHeight(); }
          }, (type === "init") ? 100 : 0);
        }
      } else { // FADE:
        slider.slides.css({"width": "100%", "float": "left", "marginRight": "-100%", "position": "relative"});
        if (type === "init") {
          if (!touch) {
            //slider.slides.eq(slider.currentSlide).fadeIn(slider.vars.animationSpeed, slider.vars.easing);
            if (slider.vars.fadeFirstSlide == false) {
              slider.slides.css({ "opacity": 0, "display": "block", "zIndex": 1 }).eq(slider.currentSlide).css({"zIndex": 2}).css({"opacity": 1});
            } else {
              slider.slides.css({ "opacity": 0, "display": "block", "zIndex": 1 }).eq(slider.currentSlide).css({"zIndex": 2}).animate({"opacity": 1},slider.vars.animationSpeed,slider.vars.easing);
            }
          } else {
            slider.slides.css({ "opacity": 0, "display": "block", "webkitTransition": "opacity " + slider.vars.animationSpeed / 1000 + "s ease", "zIndex": 1 }).eq(slider.currentSlide).css({ "opacity": 1, "zIndex": 2});
          }
        }
        // SMOOTH HEIGHT:
        if (slider.vars.smoothHeight) { methods.smoothHeight(); }
      }
      // !CAROUSEL:
      // CANDIDATE: active slide
      if (!carousel) { slider.slides.removeClass(namespace + "active-slide").eq(slider.currentSlide).addClass(namespace + "active-slide"); }

      //FlexSlider: init() Callback
      slider.vars.init(slider);
    };

    slider.doMath = function() {
      var slide = slider.slides.first(),
          slideMargin = slider.vars.itemMargin,
          minItems = slider.vars.minItems,
          maxItems = slider.vars.maxItems;

      slider.w = (slider.viewport===undefined) ? slider.width() : slider.viewport.width();
      slider.h = slide.height();
      slider.boxPadding = slide.outerWidth() - slide.width();

      // CAROUSEL:
      if (carousel) {
        slider.itemT = slider.vars.itemWidth + slideMargin;
        slider.itemM = slideMargin;
        slider.minW = (minItems) ? minItems * slider.itemT : slider.w;
        slider.maxW = (maxItems) ? (maxItems * slider.itemT) - slideMargin : slider.w;
        slider.itemW = (slider.minW > slider.w) ? (slider.w - (slideMargin * (minItems - 1)))/minItems :
                       (slider.maxW < slider.w) ? (slider.w - (slideMargin * (maxItems - 1)))/maxItems :
                       (slider.vars.itemWidth > slider.w) ? slider.w : slider.vars.itemWidth;

        slider.visible = Math.floor(slider.w/(slider.itemW));
        slider.move = (slider.vars.move > 0 && slider.vars.move < slider.visible ) ? slider.vars.move : slider.visible;
        slider.pagingCount = Math.ceil(((slider.count - slider.visible)/slider.move) + 1);
        slider.last =  slider.pagingCount - 1;
        slider.limit = (slider.pagingCount === 1) ? 0 :
                       (slider.vars.itemWidth > slider.w) ? (slider.itemW * (slider.count - 1)) + (slideMargin * (slider.count - 1)) : ((slider.itemW + slideMargin) * slider.count) - slider.w - slideMargin;
      } else {
        slider.itemW = slider.w;
        slider.itemM = slideMargin;
        slider.pagingCount = slider.count;
        slider.last = slider.count - 1;
      }
      slider.computedW = slider.itemW - slider.boxPadding;
      slider.computedM = slider.itemM;
    };

    slider.update = function(pos, action) {
      slider.doMath();

      // update currentSlide and slider.animatingTo if necessary
      if (!carousel) {
        if (pos < slider.currentSlide) {
          slider.currentSlide += 1;
        } else if (pos <= slider.currentSlide && pos !== 0) {
          slider.currentSlide -= 1;
        }
        slider.animatingTo = slider.currentSlide;
      }

      // update controlNav
      if (slider.vars.controlNav && !slider.manualControls) {
        if ((action === "add" && !carousel) || slider.pagingCount > slider.controlNav.length) {
          methods.controlNav.update("add");
        } else if ((action === "remove" && !carousel) || slider.pagingCount < slider.controlNav.length) {
          if (carousel && slider.currentSlide > slider.last) {
            slider.currentSlide -= 1;
            slider.animatingTo -= 1;
          }
          methods.controlNav.update("remove", slider.last);
        }
      }
      // update directionNav
      if (slider.vars.directionNav) { methods.directionNav.update(); }

    };

    slider.addSlide = function(obj, pos) {
      var $obj = $(obj);

      slider.count += 1;
      slider.last = slider.count - 1;

      // append new slide
      if (vertical && reverse) {
        (pos !== undefined) ? slider.slides.eq(slider.count - pos).after($obj) : slider.container.prepend($obj);
      } else {
        (pos !== undefined) ? slider.slides.eq(pos).before($obj) : slider.container.append($obj);
      }

      // update currentSlide, animatingTo, controlNav, and directionNav
      slider.update(pos, "add");

      // update slider.slides
      slider.slides = $(slider.vars.selector + ':not(.clone)', slider);
      // re-setup the slider to accomdate new slide
      slider.setup();

      //FlexSlider: added() Callback
      slider.vars.added(slider);
    };
    slider.removeSlide = function(obj) {
      var pos = (isNaN(obj)) ? slider.slides.index($(obj)) : obj;

      // update count
      slider.count -= 1;
      slider.last = slider.count - 1;

      // remove slide
      if (isNaN(obj)) {
        $(obj, slider.slides).remove();
      } else {
        (vertical && reverse) ? slider.slides.eq(slider.last).remove() : slider.slides.eq(obj).remove();
      }

      // update currentSlide, animatingTo, controlNav, and directionNav
      slider.doMath();
      slider.update(pos, "remove");

      // update slider.slides
      slider.slides = $(slider.vars.selector + ':not(.clone)', slider);
      // re-setup the slider to accomdate new slide
      slider.setup();

      // FlexSlider: removed() Callback
      slider.vars.removed(slider);
    };

    //FlexSlider: Initialize
    methods.init();
  };

  // Ensure the slider isn't focussed if the window loses focus.
  $( window ).blur( function ( e ) {
    focused = false;
  }).focus( function ( e ) {
    focused = true;
  });

  //FlexSlider: Default Settings
  $.flexslider.defaults = {
    namespace: "flex-",             //{NEW} String: Prefix string attached to the class of every element generated by the plugin
    selector: ".slides > li",       //{NEW} Selector: Must match a simple pattern. '{container} > {slide}' -- Ignore pattern at your own peril
    animation: "fade",              //String: Select your animation type, "fade" or "slide"
    easing: "swing",                //{NEW} String: Determines the easing method used in jQuery transitions. jQuery easing plugin is supported!
    direction: "horizontal",        //String: Select the sliding direction, "horizontal" or "vertical"
    reverse: false,                 //{NEW} Boolean: Reverse the animation direction
    animationLoop: true,            //Boolean: Should the animation loop? If false, directionNav will received "disable" classes at either end
    smoothHeight: false,            //{NEW} Boolean: Allow height of the slider to animate smoothly in horizontal mode
    startAt: 0,                     //Integer: The slide that the slider should start on. Array notation (0 = first slide)
    slideshow: true,                //Boolean: Animate slider automatically
    slideshowSpeed: 7000,           //Integer: Set the speed of the slideshow cycling, in milliseconds
    animationSpeed: 600,            //Integer: Set the speed of animations, in milliseconds
    initDelay: 0,                   //{NEW} Integer: Set an initialization delay, in milliseconds
    randomize: false,               //Boolean: Randomize slide order
    fadeFirstSlide: true,           //Boolean: Fade in the first slide when animation type is "fade"
    thumbCaptions: false,           //Boolean: Whether or not to put captions on thumbnails when using the "thumbnails" controlNav.

    // Usability features
    pauseOnAction: true,            //Boolean: Pause the slideshow when interacting with control elements, highly recommended.
    pauseOnHover: false,            //Boolean: Pause the slideshow when hovering over slider, then resume when no longer hovering
    pauseInvisible: true,       //{NEW} Boolean: Pause the slideshow when tab is invisible, resume when visible. Provides better UX, lower CPU usage.
    useCSS: true,                   //{NEW} Boolean: Slider will use CSS3 transitions if available
    touch: true,                    //{NEW} Boolean: Allow touch swipe navigation of the slider on touch-enabled devices
    video: false,                   //{NEW} Boolean: If using video in the slider, will prevent CSS3 3D Transforms to avoid graphical glitches

    // Primary Controls
    controlNav: true,               //Boolean: Create navigation for paging control of each slide? Note: Leave true for manualControls usage
    directionNav: true,             //Boolean: Create navigation for previous/next navigation? (true/false)
    prevText: "Previous",           //String: Set the text for the "previous" directionNav item
    nextText: "Next",               //String: Set the text for the "next" directionNav item

    // Secondary Navigation
    keyboard: true,                 //Boolean: Allow slider navigating via keyboard left/right keys
    multipleKeyboard: false,        //{NEW} Boolean: Allow keyboard navigation to affect multiple sliders. Default behavior cuts out keyboard navigation with more than one slider present.
    mousewheel: false,              //{UPDATED} Boolean: Requires jquery.mousewheel.js (https://github.com/brandonaaron/jquery-mousewheel) - Allows slider navigating via mousewheel
    pausePlay: false,               //Boolean: Create pause/play dynamic element
    pauseText: "Pause",             //String: Set the text for the "pause" pausePlay item
    playText: "Play",               //String: Set the text for the "play" pausePlay item

    // Special properties
    controlsContainer: "",          //{UPDATED} jQuery Object/Selector: Declare which container the navigation elements should be appended too. Default container is the FlexSlider element. Example use would be $(".flexslider-container"). Property is ignored if given element is not found.
    manualControls: "",             //{UPDATED} jQuery Object/Selector: Declare custom control navigation. Examples would be $(".flex-control-nav li") or "#tabs-nav li img", etc. The number of elements in your controlNav should match the number of slides/tabs.
    customDirectionNav: "",         //{NEW} jQuery Object/Selector: Custom prev / next button. Must be two jQuery elements. In order to make the events work they have to have the classes "prev" and "next" (plus namespace)
    sync: "",                       //{NEW} Selector: Mirror the actions performed on this slider with another slider. Use with care.
    asNavFor: "",                   //{NEW} Selector: Internal property exposed for turning the slider into a thumbnail navigation for another slider

    // Carousel Options
    itemWidth: 0,                   //{NEW} Integer: Box-model width of individual carousel items, including horizontal borders and padding.
    itemMargin: 0,                  //{NEW} Integer: Margin between carousel items.
    minItems: 1,                    //{NEW} Integer: Minimum number of carousel items that should be visible. Items will resize fluidly when below this.
    maxItems: 0,                    //{NEW} Integer: Maxmimum number of carousel items that should be visible. Items will resize fluidly when above this limit.
    move: 0,                        //{NEW} Integer: Number of carousel items that should move on animation. If 0, slider will move all visible items.
    allowOneSlide: true,           //{NEW} Boolean: Whether or not to allow a slider comprised of a single slide

    // Callback API
    start: function(){},            //Callback: function(slider) - Fires when the slider loads the first slide
    before: function(){},           //Callback: function(slider) - Fires asynchronously with each slider animation
    after: function(){},            //Callback: function(slider) - Fires after each slider animation completes
    end: function(){},              //Callback: function(slider) - Fires when the slider reaches the last slide (asynchronous)
    added: function(){},            //{NEW} Callback: function(slider) - Fires after a slide is added
    removed: function(){},           //{NEW} Callback: function(slider) - Fires after a slide is removed
    init: function() {}             //{NEW} Callback: function(slider) - Fires after the slider is initially setup
  };

  //FlexSlider: Plugin Function
  $.fn.flexslider = function(options) {
    if (options === undefined) { options = {}; }

    if (typeof options === "object") {
      return this.each(function() {
        var $this = $(this),
            selector = (options.selector) ? options.selector : ".slides > li",
            $slides = $this.find(selector);

      if ( ( $slides.length === 1 && options.allowOneSlide === false ) || $slides.length === 0 ) {
          $slides.fadeIn(400);
          if (options.start) { options.start($this); }
        } else if ($this.data('flexslider') === undefined) {
          new $.flexslider(this, options);
        }
      });
    } else {
      // Helper strings to quickly perform functions on the slider
      var $slider = $(this).data('flexslider');
      switch (options) {
        case "play": $slider.play(); break;
        case "pause": $slider.pause(); break;
        case "stop": $slider.stop(); break;
        case "next": $slider.flexAnimate($slider.getTarget("next"), true); break;
        case "prev":
        case "previous": $slider.flexAnimate($slider.getTarget("prev"), true); break;
        default: if (typeof options === "number") { $slider.flexAnimate(options, true); }
      }
    }
  };
})(jQuery);


(function() {
  var MutationObserver, Util, WeakMap, getComputedStyle, getComputedStyleRX,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Util = (function() {
    function Util() {}

    Util.prototype.extend = function(custom, defaults) {
      var key, value;
      for (key in defaults) {
        value = defaults[key];
        if (custom[key] == null) {
          custom[key] = value;
        }
      }
      return custom;
    };

    Util.prototype.isMobile = function(agent) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent);
    };

    Util.prototype.createEvent = function(event, bubble, cancel, detail) {
      var customEvent;
      if (bubble == null) {
        bubble = false;
      }
      if (cancel == null) {
        cancel = false;
      }
      if (detail == null) {
        detail = null;
      }
      if (document.createEvent != null) {
        customEvent = document.createEvent('CustomEvent');
        customEvent.initCustomEvent(event, bubble, cancel, detail);
      } else if (document.createEventObject != null) {
        customEvent = document.createEventObject();
        customEvent.eventType = event;
      } else {
        customEvent.eventName = event;
      }
      return customEvent;
    };

    Util.prototype.emitEvent = function(elem, event) {
      if (elem.dispatchEvent != null) {
        return elem.dispatchEvent(event);
      } else if (event in (elem != null)) {
        return elem[event]();
      } else if (("on" + event) in (elem != null)) {
        return elem["on" + event]();
      }
    };

    Util.prototype.addEvent = function(elem, event, fn) {
      if (elem.addEventListener != null) {
        return elem.addEventListener(event, fn, false);
      } else if (elem.attachEvent != null) {
        return elem.attachEvent("on" + event, fn);
      } else {
        return elem[event] = fn;
      }
    };

    Util.prototype.removeEvent = function(elem, event, fn) {
      if (elem.removeEventListener != null) {
        return elem.removeEventListener(event, fn, false);
      } else if (elem.detachEvent != null) {
        return elem.detachEvent("on" + event, fn);
      } else {
        return delete elem[event];
      }
    };

    Util.prototype.innerHeight = function() {
      if ('innerHeight' in window) {
        return window.innerHeight;
      } else {
        return document.documentElement.clientHeight;
      }
    };

    return Util;

  })();

  WeakMap = this.WeakMap || this.MozWeakMap || (WeakMap = (function() {
    function WeakMap() {
      this.keys = [];
      this.values = [];
    }

    WeakMap.prototype.get = function(key) {
      var i, item, j, len, ref;
      ref = this.keys;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        item = ref[i];
        if (item === key) {
          return this.values[i];
        }
      }
    };

    WeakMap.prototype.set = function(key, value) {
      var i, item, j, len, ref;
      ref = this.keys;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        item = ref[i];
        if (item === key) {
          this.values[i] = value;
          return;
        }
      }
      this.keys.push(key);
      return this.values.push(value);
    };

    return WeakMap;

  })());

  MutationObserver = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || (MutationObserver = (function() {
    function MutationObserver() {
      if (typeof console !== "undefined" && console !== null) {
        console.warn('MutationObserver is not supported by your browser.');
      }
      if (typeof console !== "undefined" && console !== null) {
        console.warn('WOW.js cannot detect dom mutations, please call .sync() after loading new content.');
      }
    }

    MutationObserver.notSupported = true;

    MutationObserver.prototype.observe = function() {};

    return MutationObserver;

  })());

  getComputedStyle = this.getComputedStyle || function(el, pseudo) {
    this.getPropertyValue = function(prop) {
      var ref;
      if (prop === 'float') {
        prop = 'styleFloat';
      }
      if (getComputedStyleRX.test(prop)) {
        prop.replace(getComputedStyleRX, function(_, _char) {
          return _char.toUpperCase();
        });
      }
      return ((ref = el.currentStyle) != null ? ref[prop] : void 0) || null;
    };
    return this;
  };

  getComputedStyleRX = /(\-([a-z]){1})/g;

  this.WOW = (function() {
    WOW.prototype.defaults = {
      boxClass: 'wow',
      animateClass: 'animated',
      offset: 0,
      mobile: true,
      live: true,
      callback: null
    };

    function WOW(options) {
      if (options == null) {
        options = {};
      }
      this.scrollCallback = bind(this.scrollCallback, this);
      this.scrollHandler = bind(this.scrollHandler, this);
      this.resetAnimation = bind(this.resetAnimation, this);
      this.start = bind(this.start, this);
      this.scrolled = true;
      this.config = this.util().extend(options, this.defaults);
      this.animationNameCache = new WeakMap();
      this.wowEvent = this.util().createEvent(this.config.boxClass);
    }

    WOW.prototype.init = function() {
      var ref;
      this.element = window.document.documentElement;
      if ((ref = document.readyState) === "interactive" || ref === "complete") {
        this.start();
      } else {
        this.util().addEvent(document, 'DOMContentLoaded', this.start);
      }
      return this.finished = [];
    };

    WOW.prototype.start = function() {
      var box, j, len, ref;
      this.stopped = false;
      this.boxes = (function() {
        var j, len, ref, results;
        ref = this.element.querySelectorAll("." + this.config.boxClass);
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          box = ref[j];
          results.push(box);
        }
        return results;
      }).call(this);
      this.all = (function() {
        var j, len, ref, results;
        ref = this.boxes;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          box = ref[j];
          results.push(box);
        }
        return results;
      }).call(this);
      if (this.boxes.length) {
        if (this.disabled()) {
          this.resetStyle();
        } else {
          ref = this.boxes;
          for (j = 0, len = ref.length; j < len; j++) {
            box = ref[j];
            this.applyStyle(box, true);
          }
        }
      }
      if (!this.disabled()) {
        this.util().addEvent(window, 'scroll', this.scrollHandler);
        this.util().addEvent(window, 'resize', this.scrollHandler);
        this.interval = setInterval(this.scrollCallback, 50);
      }
      if (this.config.live) {
        return new MutationObserver((function(_this) {
          return function(records) {
            var k, len1, node, record, results;
            results = [];
            for (k = 0, len1 = records.length; k < len1; k++) {
              record = records[k];
              results.push((function() {
                var l, len2, ref1, results1;
                ref1 = record.addedNodes || [];
                results1 = [];
                for (l = 0, len2 = ref1.length; l < len2; l++) {
                  node = ref1[l];
                  results1.push(this.doSync(node));
                }
                return results1;
              }).call(_this));
            }
            return results;
          };
        })(this)).observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    };

    WOW.prototype.stop = function() {
      this.stopped = true;
      this.util().removeEvent(window, 'scroll', this.scrollHandler);
      this.util().removeEvent(window, 'resize', this.scrollHandler);
      if (this.interval != null) {
        return clearInterval(this.interval);
      }
    };

    WOW.prototype.sync = function(element) {
      if (MutationObserver.notSupported) {
        return this.doSync(this.element);
      }
    };

    WOW.prototype.doSync = function(element) {
      var box, j, len, ref, results;
      if (element == null) {
        element = this.element;
      }
      if (element.nodeType !== 1) {
        return;
      }
      element = element.parentNode || element;
      ref = element.querySelectorAll("." + this.config.boxClass);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        box = ref[j];
        if (indexOf.call(this.all, box) < 0) {
          this.boxes.push(box);
          this.all.push(box);
          if (this.stopped || this.disabled()) {
            this.resetStyle();
          } else {
            this.applyStyle(box, true);
          }
          results.push(this.scrolled = true);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    WOW.prototype.show = function(box) {
      this.applyStyle(box);
      box.className = box.className + " " + this.config.animateClass;
      if (this.config.callback != null) {
        this.config.callback(box);
      }
      this.util().emitEvent(box, this.wowEvent);
      this.util().addEvent(box, 'animationend', this.resetAnimation);
      this.util().addEvent(box, 'oanimationend', this.resetAnimation);
      this.util().addEvent(box, 'webkitAnimationEnd', this.resetAnimation);
      this.util().addEvent(box, 'MSAnimationEnd', this.resetAnimation);
      return box;
    };

    WOW.prototype.applyStyle = function(box, hidden) {
      var delay, duration, iteration;
      duration = box.getAttribute('data-wow-duration');
      delay = box.getAttribute('data-wow-delay');
      iteration = box.getAttribute('data-wow-iteration');
      return this.animate((function(_this) {
        return function() {
          return _this.customStyle(box, hidden, duration, delay, iteration);
        };
      })(this));
    };

    WOW.prototype.animate = (function() {
      if ('requestAnimationFrame' in window) {
        return function(callback) {
          return window.requestAnimationFrame(callback);
        };
      } else {
        return function(callback) {
          return callback();
        };
      }
    })();

    WOW.prototype.resetStyle = function() {
      var box, j, len, ref, results;
      ref = this.boxes;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        box = ref[j];
        results.push(box.style.visibility = 'visible');
      }
      return results;
    };

    WOW.prototype.resetAnimation = function(event) {
      var target;
      if (event.type.toLowerCase().indexOf('animationend') >= 0) {
        target = event.target || event.srcElement;
        return target.className = target.className.replace(this.config.animateClass, '').trim();
      }
    };

    WOW.prototype.customStyle = function(box, hidden, duration, delay, iteration) {
      if (hidden) {
        this.cacheAnimationName(box);
      }
      box.style.visibility = hidden ? 'hidden' : 'visible';
      if (duration) {
        this.vendorSet(box.style, {
          animationDuration: duration
        });
      }
      if (delay) {
        this.vendorSet(box.style, {
          animationDelay: delay
        });
      }
      if (iteration) {
        this.vendorSet(box.style, {
          animationIterationCount: iteration
        });
      }
      this.vendorSet(box.style, {
        animationName: hidden ? 'none' : this.cachedAnimationName(box)
      });
      return box;
    };

    WOW.prototype.vendors = ["moz", "webkit"];

    WOW.prototype.vendorSet = function(elem, properties) {
      var name, results, value, vendor;
      results = [];
      for (name in properties) {
        value = properties[name];
        elem["" + name] = value;
        results.push((function() {
          var j, len, ref, results1;
          ref = this.vendors;
          results1 = [];
          for (j = 0, len = ref.length; j < len; j++) {
            vendor = ref[j];
            results1.push(elem["" + vendor + (name.charAt(0).toUpperCase()) + (name.substr(1))] = value);
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    WOW.prototype.vendorCSS = function(elem, property) {
      var j, len, ref, result, style, vendor;
      style = getComputedStyle(elem);
      result = style.getPropertyCSSValue(property);
      ref = this.vendors;
      for (j = 0, len = ref.length; j < len; j++) {
        vendor = ref[j];
        result = result || style.getPropertyCSSValue("-" + vendor + "-" + property);
      }
      return result;
    };

    WOW.prototype.animationName = function(box) {
      var animationName;
      try {
        animationName = this.vendorCSS(box, 'animation-name').cssText;
      } catch (_error) {
        animationName = getComputedStyle(box).getPropertyValue('animation-name');
      }
      if (animationName === 'none') {
        return '';
      } else {
        return animationName;
      }
    };

    WOW.prototype.cacheAnimationName = function(box) {
      return this.animationNameCache.set(box, this.animationName(box));
    };

    WOW.prototype.cachedAnimationName = function(box) {
      return this.animationNameCache.get(box);
    };

    WOW.prototype.scrollHandler = function() {
      return this.scrolled = true;
    };

    WOW.prototype.scrollCallback = function() {
      var box;
      if (this.scrolled) {
        this.scrolled = false;
        this.boxes = (function() {
          var j, len, ref, results;
          ref = this.boxes;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            box = ref[j];
            if (!(box)) {
              continue;
            }
            if (this.isVisible(box)) {
              this.show(box);
              continue;
            }
            results.push(box);
          }
          return results;
        }).call(this);
        if (!(this.boxes.length || this.config.live)) {
          return this.stop();
        }
      }
    };

    WOW.prototype.offsetTop = function(element) {
      var top;
      while (element.offsetTop === void 0) {
        element = element.parentNode;
      }
      top = element.offsetTop;
      while (element = element.offsetParent) {
        top += element.offsetTop;
      }
      return top;
    };

    WOW.prototype.isVisible = function(box) {
      var bottom, offset, top, viewBottom, viewTop;
      offset = box.getAttribute('data-wow-offset') || this.config.offset;
      viewTop = window.pageYOffset;
      viewBottom = viewTop + Math.min(this.element.clientHeight, this.util().innerHeight()) - offset;
      top = this.offsetTop(box);
      bottom = top + box.clientHeight;
      return top <= viewBottom && bottom >= viewTop;
    };

    WOW.prototype.util = function() {
      return this._util != null ? this._util : this._util = new Util();
    };

    WOW.prototype.disabled = function() {
      return !this.config.mobile && this.util().isMobile(navigator.userAgent);
    };

    return WOW;

  })();

}).call(this);


/*___________________________________________________________________________________________________________________________________________________
 _ jquery.mb.components                                                                                                                             _
 _                                                                                                                                                  _
 _ file: jquery.mb.YTPlayer.src.js                                                                                                                  _
 _ last modified: 24/10/16 22.30                                                                                                                    _
 _                                                                                                                                                  _
 _ Open Lab s.r.l., Florence - Italy                                                                                                                _
 _                                                                                                                                                  _
 _ email: matteo@open-lab.com                                                                                                                       _
 _ site: http://pupunzi.com                                                                                                                         _
 _       http://open-lab.com                                                                                                                        _
 _ blog: http://pupunzi.open-lab.com                                                                                                                _
 _ Q&A:  http://jquery.pupunzi.com                                                                                                                  _
 _                                                                                                                                                  _
 _ Licences: MIT, GPL                                                                                                                               _
 _    http://www.opensource.org/licenses/mit-license.php                                                                                            _
 _    http://www.gnu.org/licenses/gpl.html                                                                                                          _
 _                                                                                                                                                  _
 _ Copyright (c) 2001-2016. Matteo Bicocchi (Pupunzi);                                                                                              _
 ___________________________________________________________________________________________________________________________________________________*/
var ytp = ytp || {};

function onYouTubeIframeAPIReady() {
  if( ytp.YTAPIReady ) return;
  ytp.YTAPIReady = true;
  jQuery( document ).trigger( "YTAPIReady" );
}

var getYTPVideoID = function( url ) {
  var videoID, playlistID;
  if( url.indexOf( "youtu.be" ) > 0 ) {
    videoID = url.substr( url.lastIndexOf( "/" ) + 1, url.length );
    playlistID = videoID.indexOf( "?list=" ) > 0 ? videoID.substr( videoID.lastIndexOf( "=" ), videoID.length ) : null;
    videoID = playlistID ? videoID.substr( 0, videoID.lastIndexOf( "?" ) ) : videoID;
  } else if( url.indexOf( "http" ) > -1 ) {
    //videoID = url.match( /([\/&]v\/([^&#]*))|([\\?&]v=([^&#]*))/ )[ 1 ];
    videoID = url.match( /[\\?&]v=([^&#]*)/ )[ 1 ];
    playlistID = url.indexOf( "list=" ) > 0 ? url.match( /[\\?&]list=([^&#]*)/ )[ 1 ] : null;
  } else {
    videoID = url.length > 15 ? null : url;
    playlistID = videoID ? null : url;
  }
  return {
    videoID: videoID,
    playlistID: playlistID
  };
};

( function( jQuery, ytp ) {

  jQuery.mbYTPlayer = {
    name: "jquery.mb.YTPlayer",
    version: "3.0.12",
    build: "6132",
    author: "Matteo Bicocchi (pupunzi)",
    apiKey: "",
    defaults: {
      containment: "body",
      ratio: "auto", // "auto", "16/9", "4/3"
      videoURL: null,
      playlistURL: null,
      startAt: 0,
      stopAt: 0,
      autoPlay: true,
      vol: 50, // 1 to 100
      addRaster: false,
      mask: false,
      opacity: 1,
      quality: "default", //or “small”, “medium”, “large”, “hd720”, “hd1080”, “highres”
      mute: false,
      loop: true,
      fadeOnStartTime: 1000, //fade in timing at video start
      showControls: true,
      showAnnotations: false,
      showYTLogo: true,
      stopMovieOnBlur: true,
      realfullscreen: true,
      mobileFallbackImage: null,
      gaTrack: true,
      optimizeDisplay: true,
      anchor: "center,center", // top,bottom,left,right combined in pair
      onReady: function( player ) {},
      onError: function( player, err ) {}
    },
    /**
     *  @fontface icons
     *  */
    controls: {
      play: "P",
      pause: "p",
      mute: "M",
      unmute: "A",
      onlyYT: "O",
      showSite: "R",
      ytLogo: "Y"
    },
    controlBar: null,
    loading: null,
    locationProtocol: "https:",

    filters: {
      grayscale: {
        value: 0,
        unit: "%"
      },
      hue_rotate: {
        value: 0,
        unit: "deg"
      },
      invert: {
        value: 0,
        unit: "%"
      },
      opacity: {
        value: 0,
        unit: "%"
      },
      saturate: {
        value: 0,
        unit: "%"
      },
      sepia: {
        value: 0,
        unit: "%"
      },
      brightness: {
        value: 0,
        unit: "%"
      },
      contrast: {
        value: 0,
        unit: "%"
      },
      blur: {
        value: 0,
        unit: "px"
      }
    },
    /**
     *
     * @param options
     * @returns [players]
     */
    buildPlayer: function( options ) {
      return this.each( function() {
        var YTPlayer = this;
        var $YTPlayer = jQuery( YTPlayer );
        YTPlayer.loop = 0;
        YTPlayer.opt = {};
        YTPlayer.state = {};
        YTPlayer.filters = jQuery.mbYTPlayer.filters;
        YTPlayer.filtersEnabled = true;
        YTPlayer.id = YTPlayer.id || "YTP_" + new Date().getTime();
        $YTPlayer.addClass( "mb_YTPlayer" );
        var property = $YTPlayer.data( "property" ) && typeof $YTPlayer.data( "property" ) == "string" ? eval( '(' + $YTPlayer.data( "property" ) + ')' ) : $YTPlayer.data( "property" );
        if( typeof property != "undefined" && typeof property.vol != "undefined" ) property.vol = property.vol === 0 ? property.vol = 1 : property.vol;

        jQuery.extend( YTPlayer.opt, jQuery.mbYTPlayer.defaults, options, property );

        if( !YTPlayer.hasChanged ) {
          YTPlayer.defaultOpt = {};
          jQuery.extend( YTPlayer.defaultOpt, jQuery.mbYTPlayer.defaults, options );
        }

        if( YTPlayer.opt.loop == "true" )
          YTPlayer.opt.loop = 9999;

        YTPlayer.isRetina = ( window.retina || window.devicePixelRatio > 1 );
        var isIframe = function() {
          var isIfr = false;
          try {
            if( self.location.href != top.location.href ) isIfr = true;
          } catch( e ) {
            isIfr = true;
          }
          return isIfr;
        };
        YTPlayer.canGoFullScreen = !( jQuery.browser.msie || jQuery.browser.opera || isIframe() );
        if( !YTPlayer.canGoFullScreen ) YTPlayer.opt.realfullscreen = false;
        if( !$YTPlayer.attr( "id" ) ) $YTPlayer.attr( "id", "ytp_" + new Date().getTime() );
        var playerID = "mbYTP_" + YTPlayer.id;
        YTPlayer.isAlone = false;
        YTPlayer.hasFocus = true;
        YTPlayer.videoID = this.opt.videoURL ? getYTPVideoID( this.opt.videoURL ).videoID : $YTPlayer.attr( "href" ) ? getYTPVideoID( $YTPlayer.attr( "href" ) ).videoID : false;
        YTPlayer.playlistID = this.opt.videoURL ? getYTPVideoID( this.opt.videoURL ).playlistID : $YTPlayer.attr( "href" ) ? getYTPVideoID( $YTPlayer.attr( "href" ) ).playlistID : false;

        YTPlayer.opt.showAnnotations = YTPlayer.opt.showAnnotations ? '0' : '3';

        var playerVars = {
          'modestbranding': 1,
          'autoplay': 0,
          'controls': 0,
          'showinfo': 0,
          'rel': 0,
          'enablejsapi': 1,
          'version': 3,
          'playerapiid': playerID,
          'origin': '*',
          'allowfullscreen': true,
          'wmode': 'transparent',
          'iv_load_policy': YTPlayer.opt.showAnnotations
        };

        if( document.createElement( 'video' ).canPlayType ) jQuery.extend( playerVars, {
          'html5': 1
        } );
        if( jQuery.browser.msie && jQuery.browser.version < 9 ) this.opt.opacity = 1;

        YTPlayer.isSelf = YTPlayer.opt.containment == "self";
        YTPlayer.defaultOpt.containment = YTPlayer.opt.containment = YTPlayer.opt.containment == "self" ? jQuery( this ) : jQuery( YTPlayer.opt.containment );
        YTPlayer.isBackground = YTPlayer.opt.containment.is( "body" );

        if( YTPlayer.isBackground && ytp.backgroundIsInited )
          return;

        var isPlayer = YTPlayer.opt.containment.is( jQuery( this ) );

        YTPlayer.canPlayOnMobile = isPlayer && jQuery( this ).children().length === 0;
        YTPlayer.isPlayer = false;

        if( !isPlayer ) {
          $YTPlayer.hide();
        } else {
          YTPlayer.isPlayer = true;
        }

        var overlay = jQuery( "<div/>" ).css( {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%"
        } ).addClass( "mbYTP_overlay" );

        if( YTPlayer.isPlayer ) {
          overlay.on( "click", function() {
            $YTPlayer.YTPTogglePlay();
          } )
        }

        var wrapper = jQuery( "<div/>" ).addClass( "mbYTP_wrapper" ).attr( "id", "wrapper_" + playerID );
        wrapper.css( {
          position: "absolute",
          zIndex: 0,
          minWidth: "100%",
          minHeight: "100%",
          left: 0,
          top: 0,
          overflow: "hidden",
          opacity: 0
        } );

        var playerBox = jQuery( "<div/>" ).addClass( "mbYTP_playerBox" ).attr( "id", playerID );
        playerBox.css( {
          position: "absolute",
          zIndex: 0,
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          overflow: "hidden"
        } );

        wrapper.append( playerBox );

        YTPlayer.opt.containment.children().not( "script, style" ).each( function() {
          if( jQuery( this ).css( "position" ) == "static" ) jQuery( this ).css( "position", "relative" );
        } );

        if( YTPlayer.isBackground ) {
          jQuery( "body" ).css( {
            boxSizing: "border-box"
          } );

          wrapper.css( {
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 0
          } );

          $YTPlayer.hide();

        } else if( YTPlayer.opt.containment.css( "position" ) == "static" )
          YTPlayer.opt.containment.css( {
            position: "relative"
          } );

        YTPlayer.opt.containment.prepend( wrapper );
        YTPlayer.wrapper = wrapper;

        playerBox.css( {
          opacity: 1
        } );

        if( !jQuery.browser.mobile ) {
          playerBox.after( overlay );
          YTPlayer.overlay = overlay;
        }

        if( !YTPlayer.isBackground ) {
          overlay.on( "mouseenter", function() {
            if( YTPlayer.controlBar && YTPlayer.controlBar.length )
              YTPlayer.controlBar.addClass( "visible" );
          } ).on( "mouseleave", function() {
            if( YTPlayer.controlBar && YTPlayer.controlBar.length )
              YTPlayer.controlBar.removeClass( "visible" );
          } );
        }

        if( !ytp.YTAPIReady ) {
          jQuery( "#YTAPI" ).remove();
          var tag = jQuery( "<script></script>" ).attr( {
            "src": jQuery.mbYTPlayer.locationProtocol + "//www.youtube.com/iframe_api?v=" + jQuery.mbYTPlayer.version,
            "id": "YTAPI"
          } );
          jQuery( "head" ).prepend( tag );
        } else {
          setTimeout( function() {
            jQuery( document ).trigger( "YTAPIReady" );
          }, 100 )
        }

        if( jQuery.browser.mobile && !YTPlayer.canPlayOnMobile ) {

          if( YTPlayer.opt.mobileFallbackImage ) {
            wrapper.css( {
              backgroundImage: "url(" + YTPlayer.opt.mobileFallbackImage + ")",
              backgroundPosition: "center center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              opacity: 1
            } )
          };

          $YTPlayer.remove();
          jQuery( document ).trigger( "YTPUnavailable" );
          return;
        }

        jQuery( document ).on( "YTAPIReady", function() {
          if( ( YTPlayer.isBackground && ytp.backgroundIsInited ) || YTPlayer.isInit ) return;
          if( YTPlayer.isBackground ) {
            ytp.backgroundIsInited = true;
          }

          YTPlayer.opt.autoPlay = typeof YTPlayer.opt.autoPlay == "undefined" ? ( YTPlayer.isBackground ? true : false ) : YTPlayer.opt.autoPlay;
          YTPlayer.opt.vol = YTPlayer.opt.vol ? YTPlayer.opt.vol : 100;
          jQuery.mbYTPlayer.getDataFromAPI( YTPlayer );
          jQuery( YTPlayer ).on( "YTPChanged", function() {

            if( YTPlayer.isInit )
              return;

            YTPlayer.isInit = true;

            //if is mobile && isPlayer fallback to the default YT player
            if( jQuery.browser.mobile && YTPlayer.canPlayOnMobile ) {
              // Try to adjust the player dimention
              if( YTPlayer.opt.containment.outerWidth() > jQuery( window ).width() ) {
                YTPlayer.opt.containment.css( {
                  maxWidth: "100%"
                } );
                var h = YTPlayer.opt.containment.outerWidth() * .563;
                YTPlayer.opt.containment.css( {
                  maxHeight: h
                } );
              }
              new YT.Player( playerID, {
                videoId: YTPlayer.videoID.toString(),
                width: '100%',
                height: h,
                playerVars: playerVars,
                events: {
                  'onReady': function( event ) {
                    YTPlayer.player = event.target;
                    playerBox.css( {
                      opacity: 1
                    } );
                    YTPlayer.wrapper.css( {
                      opacity: 1
                    } );
                  }
                }
              } );
              return;
            }

            new YT.Player( playerID, {
              videoId: YTPlayer.videoID.toString(),
              playerVars: playerVars,
              events: {
                'onReady': function( event ) {
                  YTPlayer.player = event.target;
                  if( YTPlayer.isReady ) return;
                  YTPlayer.isReady = YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ? false : true;
                  YTPlayer.playerEl = YTPlayer.player.getIframe();

                  jQuery( YTPlayer.playerEl ).unselectable();

                  $YTPlayer.optimizeDisplay();
                  jQuery( window ).off( "resize.YTP_" + YTPlayer.id ).on( "resize.YTP_" + YTPlayer.id, function() {
                    $YTPlayer.optimizeDisplay();
                  } );

                  jQuery.mbYTPlayer.checkForState( YTPlayer );
                },
                /**
                 *
                 * @param event
                 *
                 * -1 (unstarted)
                 * 0 (ended)
                 * 1 (playing)
                 * 2 (paused)
                 * 3 (buffering)
                 * 5 (video cued).
                 *
                 *
                 */
                'onStateChange': function( event ) {
                  if( typeof event.target.getPlayerState != "function" ) return;
                  var state = event.target.getPlayerState();

                  if( YTPlayer.preventTrigger ) {
                    YTPlayer.preventTrigger = false;
                    return
                  }

                  /*
                   if( YTPlayer.state == state )
                   return;
                   */

                  YTPlayer.state = state;

                  var eventType;
                  switch( state ) {
                    case -1: //----------------------------------------------- unstarted
                      eventType = "YTPUnstarted";
                      break;
                    case 0: //------------------------------------------------ ended
                      eventType = "YTPEnd";
                      break;
                    case 1: //------------------------------------------------ play
                      eventType = "YTPPlay";
                      if( YTPlayer.controlBar.length )
                        YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.pause );
                      if( typeof _gaq != "undefined" && eval( YTPlayer.opt.gaTrack ) ) _gaq.push( [ '_trackEvent', 'YTPlayer', 'Play', ( YTPlayer.hasData ? YTPlayer.videoData.title : YTPlayer.videoID.toString() ) ] );
                      if( typeof ga != "undefined" && eval( YTPlayer.opt.gaTrack ) ) ga( 'send', 'event', 'YTPlayer', 'play', ( YTPlayer.hasData ? YTPlayer.videoData.title : YTPlayer.videoID.toString() ) );
                      break;
                    case 2: //------------------------------------------------ pause
                      eventType = "YTPPause";
                      if( YTPlayer.controlBar.length )
                        YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );
                      break;
                    case 3: //------------------------------------------------ buffer
                      YTPlayer.player.setPlaybackQuality( YTPlayer.opt.quality );
                      eventType = "YTPBuffering";
                      if( YTPlayer.controlBar.length )
                        YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );
                      break;
                    case 5: //------------------------------------------------ cued
                      eventType = "YTPCued";
                      break;
                    default:
                      break;
                  }

                  // Trigger state events
                  var YTPEvent = jQuery.Event( eventType );
                  YTPEvent.time = YTPlayer.currentTime;
                  if( YTPlayer.canTrigger ) jQuery( YTPlayer ).trigger( YTPEvent );
                },
                /**
                 *
                 * @param e
                 */
                'onPlaybackQualityChange': function( e ) {
                  var quality = e.target.getPlaybackQuality();
                  var YTPQualityChange = jQuery.Event( "YTPQualityChange" );
                  YTPQualityChange.quality = quality;
                  jQuery( YTPlayer ).trigger( YTPQualityChange );
                },
                /**
                 *
                 * @param err
                 */
                'onError': function( err ) {

                  if( err.data == 150 ) {
                    console.log( "Embedding this video is restricted by Youtube." );
                    if( YTPlayer.isPlayList )
                      jQuery( YTPlayer ).playNext();
                  }

                  if( err.data == 2 && YTPlayer.isPlayList )
                    jQuery( YTPlayer ).playNext();

                  if( typeof YTPlayer.opt.onError == "function" )
                    YTPlayer.opt.onError( $YTPlayer, err );
                }
              }
            } );
          } );
        } );

        $YTPlayer.off( "YTPTime.mask" );

        jQuery.mbYTPlayer.applyMask( YTPlayer );

      } );
    },
    /**
     *
     * @param YTPlayer
     */
    getDataFromAPI: function( YTPlayer ) {
      YTPlayer.videoData = jQuery.mbStorage.get( "YTPlayer_data_" + YTPlayer.videoID );
      jQuery( YTPlayer ).off( "YTPData.YTPlayer" ).on( "YTPData.YTPlayer", function() {
        if( YTPlayer.hasData ) {

          if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ) {
            var bgndURL = YTPlayer.videoData.thumb_max || YTPlayer.videoData.thumb_high || YTPlayer.videoData.thumb_medium;

            YTPlayer.opt.containment.css( {
              background: "rgba(0,0,0,0.5) url(" + bgndURL + ") center center",
              backgroundSize: "cover"
            } );
            YTPlayer.opt.backgroundUrl = bgndURL;
          }
        }
      } );

      if( YTPlayer.videoData ) {

        setTimeout( function() {
          YTPlayer.opt.ratio = YTPlayer.opt.ratio == "auto" ? "16/9" : YTPlayer.opt.ratio;
          YTPlayer.dataReceived = true;
          jQuery( YTPlayer ).trigger( "YTPChanged" );
          var YTPData = jQuery.Event( "YTPData" );
          YTPData.prop = {};
          for( var x in YTPlayer.videoData ) YTPData.prop[ x ] = YTPlayer.videoData[ x ];
          jQuery( YTPlayer ).trigger( YTPData );
        }, 500 );

        YTPlayer.hasData = true;
      } else if( jQuery.mbYTPlayer.apiKey ) {
        // Get video info from API3 (needs api key)
        // snippet,player,contentDetails,statistics,status
        jQuery.getJSON( jQuery.mbYTPlayer.locationProtocol + "//www.googleapis.com/youtube/v3/videos?id=" + YTPlayer.videoID + "&key=" + jQuery.mbYTPlayer.apiKey + "&part=snippet", function( data ) {
          YTPlayer.dataReceived = true;
          jQuery( YTPlayer ).trigger( "YTPChanged" );

          function parseYTPlayer_data( data ) {
            YTPlayer.videoData = {};
            YTPlayer.videoData.id = YTPlayer.videoID;
            YTPlayer.videoData.channelTitle = data.channelTitle;
            YTPlayer.videoData.title = data.title;
            YTPlayer.videoData.description = data.description.length < 400 ? data.description : data.description.substring( 0, 400 ) + " ...";
            YTPlayer.videoData.aspectratio = YTPlayer.opt.ratio == "auto" ? "16/9" : YTPlayer.opt.ratio;
            YTPlayer.opt.ratio = YTPlayer.videoData.aspectratio;
            YTPlayer.videoData.thumb_max = data.thumbnails.maxres ? data.thumbnails.maxres.url : null;
            YTPlayer.videoData.thumb_high = data.thumbnails.high ? data.thumbnails.high.url : null;
            YTPlayer.videoData.thumb_medium = data.thumbnails.medium ? data.thumbnails.medium.url : null;
            jQuery.mbStorage.set( "YTPlayer_data_" + YTPlayer.videoID, YTPlayer.videoData );
          }

          parseYTPlayer_data( data.items[ 0 ].snippet );
          YTPlayer.hasData = true;
          var YTPData = jQuery.Event( "YTPData" );
          YTPData.prop = {};
          for( var x in YTPlayer.videoData ) YTPData.prop[ x ] = YTPlayer.videoData[ x ];
          jQuery( YTPlayer ).trigger( YTPData );
        } );
      } else {
        setTimeout( function() {
          jQuery( YTPlayer ).trigger( "YTPChanged" );
        }, 50 );
        if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ) {
          var bgndURL = jQuery.mbYTPlayer.locationProtocol + "//i.ytimg.com/vi/" + YTPlayer.videoID + "/hqdefault.jpg";

          if( bgndURL )
            YTPlayer.opt.containment.css( {
              background: "rgba(0,0,0,0.5) url(" + bgndURL + ") center center",
              backgroundSize: "cover"
            } );
          YTPlayer.opt.backgroundUrl = bgndURL;

        }
        YTPlayer.videoData = null;
        YTPlayer.opt.ratio = YTPlayer.opt.ratio == "auto" ? "16/9" : YTPlayer.opt.ratio;
      }
      if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay && !jQuery.browser.mobile ) {
        YTPlayer.loading = jQuery( "<div/>" ).addClass( "loading" ).html( "Loading" ).hide();
        jQuery( YTPlayer ).append( YTPlayer.loading );
        YTPlayer.loading.fadeIn();
      }
    },
    /**
     *
     */
    removeStoredData: function() {
      jQuery.mbStorage.remove();
    },
    /**
     *
     * @returns {*|YTPlayer.videoData}
     */
    getVideoData: function() {
      var YTPlayer = this.get( 0 );
      return YTPlayer.videoData;
    },
    /**
     *
     * @returns {*|YTPlayer.videoID|boolean}
     */
    getVideoID: function() {
      var YTPlayer = this.get( 0 );
      return YTPlayer.videoID || false;
    },
    /**
     *
     * @param quality
     */
    setVideoQuality: function( quality ) {
      var YTPlayer = this.get( 0 );
      //if( !jQuery.browser.chrome )
      YTPlayer.player.setPlaybackQuality( quality );
    },
    /**
     *
     * @param videos
     * @param shuffle
     * @param callback
     * @param loopList
     * @returns {jQuery.mbYTPlayer}
     */
    playlist: function( videos, shuffle, callback, loopList ) {
      var $YTPlayer = this;
      var YTPlayer = $YTPlayer.get( 0 );
      YTPlayer.isPlayList = true;
      if( shuffle ) videos = jQuery.shuffle( videos );
      if( !YTPlayer.videoID ) {
        YTPlayer.videos = videos;
        YTPlayer.videoCounter = 0;
        YTPlayer.videoLength = videos.length;
        jQuery( YTPlayer ).data( "property", videos[ 0 ] );
        jQuery( YTPlayer ).mb_YTPlayer();
      }
      if( typeof callback == "function" ) jQuery( YTPlayer ).one( "YTPChanged", function() {
        callback( YTPlayer );
      } );
      jQuery( YTPlayer ).on( "YTPEnd", function() {
        loopList = typeof loopList == "undefined" ? true : loopList;
        jQuery( YTPlayer ).playNext( loopList );
      } );
      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    playNext: function( loopList ) {
      var YTPlayer = this.get( 0 );

      if( YTPlayer.checkForStartAt ) {
        clearTimeout( YTPlayer.checkForStartAt );
        clearInterval( YTPlayer.getState );
      }

      YTPlayer.videoCounter++;
      if( YTPlayer.videoCounter >= YTPlayer.videoLength && loopList )
        YTPlayer.videoCounter = 0;

      if( YTPlayer.videoCounter < YTPlayer.videoLength )
        jQuery( YTPlayer ).YTPChangeMovie( YTPlayer.videos[ YTPlayer.videoCounter ] );
      else
        YTPlayer.videoCounter--;

      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    playPrev: function() {
      var YTPlayer = this.get( 0 );

      if( YTPlayer.checkForStartAt ) {
        clearInterval( YTPlayer.checkForStartAt );
        clearInterval( YTPlayer.getState );
      }

      YTPlayer.videoCounter--;
      if( YTPlayer.videoCounter < 0 ) YTPlayer.videoCounter = YTPlayer.videoLength - 1;
      jQuery( YTPlayer ).YTPChangeMovie( YTPlayer.videos[ YTPlayer.videoCounter ] );
      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    playIndex: function( idx ) {
      var YTPlayer = this.get( 0 );

      idx = idx - 1;

      if( YTPlayer.checkForStartAt ) {
        clearInterval( YTPlayer.checkForStartAt );
        clearInterval( YTPlayer.getState );
      }

      YTPlayer.videoCounter = idx;
      if( YTPlayer.videoCounter >= YTPlayer.videoLength - 1 )
        YTPlayer.videoCounter = YTPlayer.videoLength - 1;
      jQuery( YTPlayer ).YTPChangeMovie( YTPlayer.videos[ YTPlayer.videoCounter ] );
      return this;
    },
    /**
     *
     * @param opt
     */
    changeMovie: function( opt ) {

      var $YTPlayer = this;
      var YTPlayer = $YTPlayer.get( 0 );
      YTPlayer.opt.startAt = 0;
      YTPlayer.opt.stopAt = 0;
      YTPlayer.opt.mask = false;
      YTPlayer.opt.mute = true;
      YTPlayer.hasData = false;
      YTPlayer.hasChanged = true;
      YTPlayer.player.loopTime = undefined;

      if( opt )
        jQuery.extend( YTPlayer.opt, opt ); //YTPlayer.defaultOpt,
      YTPlayer.videoID = getYTPVideoID( YTPlayer.opt.videoURL ).videoID;

      if( YTPlayer.opt.loop == "true" )
        YTPlayer.opt.loop = 9999;

      jQuery( YTPlayer.playerEl ).CSSAnimate( {
        opacity: 0
      }, YTPlayer.opt.fadeOnStartTime, function() {

        var YTPChangeMovie = jQuery.Event( "YTPChangeMovie" );
        YTPChangeMovie.time = YTPlayer.currentTime;
        YTPChangeMovie.videoId = YTPlayer.videoID;
        jQuery( YTPlayer ).trigger( YTPChangeMovie );

        jQuery( YTPlayer ).YTPGetPlayer().cueVideoByUrl( encodeURI( jQuery.mbYTPlayer.locationProtocol + "//www.youtube.com/v/" + YTPlayer.videoID ), 1, YTPlayer.opt.quality );
        jQuery( YTPlayer ).optimizeDisplay();

        jQuery.mbYTPlayer.checkForState( YTPlayer );
        jQuery.mbYTPlayer.getDataFromAPI( YTPlayer );

      } );

      jQuery.mbYTPlayer.applyMask( YTPlayer );
    },
    /**
     *
     * @returns {player}
     */
    getPlayer: function() {
      return jQuery( this ).get( 0 ).player;
    },

    playerDestroy: function() {
      var YTPlayer = this.get( 0 );
      ytp.YTAPIReady = true;
      ytp.backgroundIsInited = false;
      YTPlayer.isInit = false;
      YTPlayer.videoID = null;
      YTPlayer.isReady = false;
      var playerBox = YTPlayer.wrapper;
      playerBox.remove();
      jQuery( "#controlBar_" + YTPlayer.id ).remove();
      clearInterval( YTPlayer.checkForStartAt );
      clearInterval( YTPlayer.getState );
      return this;
    },

    /**
     *
     * @param real
     * @returns {jQuery.mbYTPlayer}
     */
    fullscreen: function( real ) {
      var YTPlayer = this.get( 0 );
      if( typeof real == "undefined" ) real = YTPlayer.opt.realfullscreen;
      real = eval( real );
      var controls = jQuery( "#controlBar_" + YTPlayer.id );
      var fullScreenBtn = controls.find( ".mb_OnlyYT" );
      var videoWrapper = YTPlayer.isSelf ? YTPlayer.opt.containment : YTPlayer.wrapper;
      //var videoWrapper = YTPlayer.wrapper;
      if( real ) {
        var fullscreenchange = jQuery.browser.mozilla ? "mozfullscreenchange" : jQuery.browser.webkit ? "webkitfullscreenchange" : "fullscreenchange";
        jQuery( document ).off( fullscreenchange ).on( fullscreenchange, function() {
          var isFullScreen = RunPrefixMethod( document, "IsFullScreen" ) || RunPrefixMethod( document, "FullScreen" );
          if( !isFullScreen ) {
            YTPlayer.isAlone = false;
            fullScreenBtn.html( jQuery.mbYTPlayer.controls.onlyYT );
            jQuery( YTPlayer ).YTPSetVideoQuality( YTPlayer.opt.quality );
            videoWrapper.removeClass( "YTPFullscreen" );
            videoWrapper.CSSAnimate( {
              opacity: YTPlayer.opt.opacity
            }, YTPlayer.opt.fadeOnStartTime );
            videoWrapper.css( {
              zIndex: 0
            } );
            if( YTPlayer.isBackground ) {
              jQuery( "body" ).after( controls );
            } else {
              YTPlayer.wrapper.before( controls );
            }
            jQuery( window ).resize();
            jQuery( YTPlayer ).trigger( "YTPFullScreenEnd" );
          } else {
            jQuery( YTPlayer ).YTPSetVideoQuality( "default" );
            jQuery( YTPlayer ).trigger( "YTPFullScreenStart" );
          }
        } );
      }
      if( !YTPlayer.isAlone ) {
        function hideMouse() {
          YTPlayer.overlay.css( {
            cursor: "none"
          } );
        }

        jQuery( document ).on( "mousemove.YTPlayer", function( e ) {
          YTPlayer.overlay.css( {
            cursor: "auto"
          } );
          clearTimeout( YTPlayer.hideCursor );
          if( !jQuery( e.target ).parents().is( ".mb_YTPBar" ) ) YTPlayer.hideCursor = setTimeout( hideMouse, 3000 );
        } );
        hideMouse();
        if( real ) {
          videoWrapper.css( {
            opacity: 0
          } );
          videoWrapper.addClass( "YTPFullscreen" );
          launchFullscreen( videoWrapper.get( 0 ) );
          setTimeout( function() {
            videoWrapper.CSSAnimate( {
              opacity: 1
            }, YTPlayer.opt.fadeOnStartTime );
            YTPlayer.wrapper.append( controls );
            jQuery( YTPlayer ).optimizeDisplay();
            YTPlayer.player.seekTo( YTPlayer.player.getCurrentTime() + .1, true );
          }, 500 )
        } else videoWrapper.css( {
          zIndex: 10000
        } ).CSSAnimate( {
          opacity: 1
        }, YTPlayer.opt.fadeOnStartTime );
        fullScreenBtn.html( jQuery.mbYTPlayer.controls.showSite );
        YTPlayer.isAlone = true;
      } else {
        jQuery( document ).off( "mousemove.YTPlayer" );
        clearTimeout( YTPlayer.hideCursor );
        YTPlayer.overlay.css( {
          cursor: "auto"
        } );
        if( real ) {
          cancelFullscreen();
        } else {
          videoWrapper.CSSAnimate( {
            opacity: YTPlayer.opt.opacity
          }, YTPlayer.opt.fadeOnStartTime );
          videoWrapper.css( {
            zIndex: 0
          } );
        }
        fullScreenBtn.html( jQuery.mbYTPlayer.controls.onlyYT );
        YTPlayer.isAlone = false;
      }

      function RunPrefixMethod( obj, method ) {
        var pfx = [ "webkit", "moz", "ms", "o", "" ];
        var p = 0,
          m, t;
        while( p < pfx.length && !obj[ m ] ) {
          m = method;
          if( pfx[ p ] == "" ) {
            m = m.substr( 0, 1 ).toLowerCase() + m.substr( 1 );
          }
          m = pfx[ p ] + m;
          t = typeof obj[ m ];
          if( t != "undefined" ) {
            pfx = [ pfx[ p ] ];
            return( t == "function" ? obj[ m ]() : obj[ m ] );
          }
          p++;
        }
      }

      function launchFullscreen( element ) {
        RunPrefixMethod( element, "RequestFullScreen" );
      }

      function cancelFullscreen() {
        if( RunPrefixMethod( document, "FullScreen" ) || RunPrefixMethod( document, "IsFullScreen" ) ) {
          RunPrefixMethod( document, "CancelFullScreen" );
        }
      }

      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    toggleLoops: function() {
      var YTPlayer = this.get( 0 );
      var data = YTPlayer.opt;
      if( data.loop == 1 ) {
        data.loop = 0;
      } else {
        if( data.startAt ) {
          YTPlayer.player.seekTo( data.startAt );
        } else {
          YTPlayer.player.playVideo();
        }
        data.loop = 1;
      }
      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    play: function() {
      var YTPlayer = this.get( 0 );
      if( !YTPlayer.isReady )
        return this;

      YTPlayer.player.playVideo();
      YTPlayer.wrapper.CSSAnimate( {
        opacity: YTPlayer.isAlone ? 1 : YTPlayer.opt.opacity
      }, YTPlayer.opt.fadeOnStartTime * 2 );

      jQuery( YTPlayer.playerEl ).CSSAnimate( {
        opacity: 1
      }, YTPlayer.opt.fadeOnStartTime );

      var controls = jQuery( "#controlBar_" + YTPlayer.id );
      var playBtn = controls.find( ".mb_YTPPlaypause" );
      playBtn.html( jQuery.mbYTPlayer.controls.pause );
      YTPlayer.state = 1;
      YTPlayer.orig_background = jQuery( YTPlayer ).css( "background-image" );
      //jQuery( YTPlayer ).css( "background-image", "none" );

      return this;
    },
    /**
     *
     * @param callback
     * @returns {jQuery.mbYTPlayer}
     */
    togglePlay: function( callback ) {
      var YTPlayer = this.get( 0 );
      if( YTPlayer.state == 1 )
        this.YTPPause();
      else
        this.YTPPlay();

      if( typeof callback == "function" )
        callback( YTPlayer.state );

      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    stop: function() {
      var YTPlayer = this.get( 0 );
      var controls = jQuery( "#controlBar_" + YTPlayer.id );
      var playBtn = controls.find( ".mb_YTPPlaypause" );
      playBtn.html( jQuery.mbYTPlayer.controls.play );
      YTPlayer.player.stopVideo();
      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    pause: function() {
      var YTPlayer = this.get( 0 );
      YTPlayer.player.pauseVideo();
      YTPlayer.state = 2;
      return this;
    },
    /**
     *
     * @param val
     * @returns {jQuery.mbYTPlayer}
     */
    seekTo: function( val ) {
      var YTPlayer = this.get( 0 );
      YTPlayer.player.seekTo( val, true );
      return this;
    },
    /**
     *
     * @param val
     * @returns {jQuery.mbYTPlayer}
     */
    setVolume: function( val ) {
      var YTPlayer = this.get( 0 );
      if( !val && !YTPlayer.opt.vol && YTPlayer.player.getVolume() == 0 ) jQuery( YTPlayer ).YTPUnmute();
      else if( ( !val && YTPlayer.player.getVolume() > 0 ) || ( val && YTPlayer.opt.vol == val ) ) {
        if( !YTPlayer.isMute ) jQuery( YTPlayer ).YTPMute();
        else jQuery( YTPlayer ).YTPUnmute();
      } else {
        YTPlayer.opt.vol = val;
        YTPlayer.player.setVolume( YTPlayer.opt.vol );
        if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.updateSliderVal( val )
      }
      return this;
    },
    /**
     *
     * @returns {boolean}
     */
    toggleVolume: function() {
      var YTPlayer = this.get( 0 );
      if( !YTPlayer ) return;
      if( YTPlayer.player.isMuted() ) {
        jQuery( YTPlayer ).YTPUnmute();
        return true;
      } else {
        jQuery( YTPlayer ).YTPMute();
        return false;
      }
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    mute: function() {
      var YTPlayer = this.get( 0 );
      if( YTPlayer.isMute ) return;
      YTPlayer.player.mute();
      YTPlayer.isMute = true;
      YTPlayer.player.setVolume( 0 );
      if( YTPlayer.volumeBar && YTPlayer.volumeBar.length && YTPlayer.volumeBar.width() > 10 ) {
        YTPlayer.volumeBar.updateSliderVal( 0 );
      }
      var controls = jQuery( "#controlBar_" + YTPlayer.id );
      var muteBtn = controls.find( ".mb_YTPMuteUnmute" );
      muteBtn.html( jQuery.mbYTPlayer.controls.unmute );
      jQuery( YTPlayer ).addClass( "isMuted" );
      if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.addClass( "muted" );
      var YTPEvent = jQuery.Event( "YTPMuted" );
      YTPEvent.time = YTPlayer.currentTime;
      if( YTPlayer.canTrigger ) jQuery( YTPlayer ).trigger( YTPEvent );
      return this;
    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    unmute: function() {
      var YTPlayer = this.get( 0 );
      if( !YTPlayer.isMute ) return;
      YTPlayer.player.unMute();
      YTPlayer.isMute = false;
      YTPlayer.player.setVolume( YTPlayer.opt.vol );
      if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.updateSliderVal( YTPlayer.opt.vol > 10 ? YTPlayer.opt.vol : 10 );
      var controls = jQuery( "#controlBar_" + YTPlayer.id );
      var muteBtn = controls.find( ".mb_YTPMuteUnmute" );
      muteBtn.html( jQuery.mbYTPlayer.controls.mute );
      jQuery( YTPlayer ).removeClass( "isMuted" );
      if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.removeClass( "muted" );
      var YTPEvent = jQuery.Event( "YTPUnmuted" );
      YTPEvent.time = YTPlayer.currentTime;
      if( YTPlayer.canTrigger ) jQuery( YTPlayer ).trigger( YTPEvent );
      return this;
    },
    /**
     * FILTERS
     *
     *
     * @param filter
     * @param value
     * @returns {jQuery.mbYTPlayer}
     */
    applyFilter: function( filter, value ) {
      return this.each( function() {
        var YTPlayer = this;
        YTPlayer.filters[ filter ].value = value;
        if( YTPlayer.filtersEnabled )
          jQuery( YTPlayer ).YTPEnableFilters();
      } );
    },
    /**
     *
     * @param filters
     * @returns {jQuery.mbYTPlayer}
     */
    applyFilters: function( filters ) {
      return this.each( function() {
        var YTPlayer = this;
        if( !YTPlayer.isReady ) {
          jQuery( YTPlayer ).on( "YTPReady", function() {
            jQuery( YTPlayer ).YTPApplyFilters( filters );
          } );
          return;
        }

        for( var key in filters )
          jQuery( YTPlayer ).YTPApplyFilter( key, filters[ key ] );

        jQuery( YTPlayer ).trigger( "YTPFiltersApplied" );
      } );
    },
    /**
     *
     * @param filter
     * @param value
     * @returns {*}
     */
    toggleFilter: function( filter, value ) {
      return this.each( function() {
        var YTPlayer = this;
        if( !YTPlayer.filters[ filter ].value ) YTPlayer.filters[ filter ].value = value;
        else YTPlayer.filters[ filter ].value = 0;
        if( YTPlayer.filtersEnabled ) jQuery( this ).YTPEnableFilters();
      } );
    },
    /**
     *
     * @param callback
     * @returns {*}
     */
    toggleFilters: function( callback ) {
      return this.each( function() {
        var YTPlayer = this;
        if( YTPlayer.filtersEnabled ) {
          jQuery( YTPlayer ).trigger( "YTPDisableFilters" );
          jQuery( YTPlayer ).YTPDisableFilters();
        } else {
          jQuery( YTPlayer ).YTPEnableFilters();
          jQuery( YTPlayer ).trigger( "YTPEnableFilters" );
        }
        if( typeof callback == "function" )
          callback( YTPlayer.filtersEnabled );
      } )
    },
    /**
     *
     * @returns {*}
     */
    disableFilters: function() {
      return this.each( function() {
        var YTPlayer = this;
        var iframe = jQuery( YTPlayer.playerEl );
        iframe.css( "-webkit-filter", "" );
        iframe.css( "filter", "" );
        YTPlayer.filtersEnabled = false;
      } )
    },
    /**
     *
     * @returns {*}
     */
    enableFilters: function() {
      return this.each( function() {
        var YTPlayer = this;
        var iframe = jQuery( YTPlayer.playerEl );
        var filterStyle = "";
        for( var key in YTPlayer.filters ) {
          if( YTPlayer.filters[ key ].value )
            filterStyle += key.replace( "_", "-" ) + "(" + YTPlayer.filters[ key ].value + YTPlayer.filters[ key ].unit + ") ";
        }
        iframe.css( "-webkit-filter", filterStyle );
        iframe.css( "filter", filterStyle );
        YTPlayer.filtersEnabled = true;
      } );
    },
    /**
     *
     * @param filter
     * @param callback
     * @returns {*}
     */
    removeFilter: function( filter, callback ) {
      return this.each( function() {
        var YTPlayer = this;
        if( typeof filter == "function" ) {
          callback = filter;
          filter = null;
        }
        if( !filter )
          for( var key in YTPlayer.filters ) {
            jQuery( this ).YTPApplyFilter( key, 0 );
            if( typeof callback == "function" ) callback( key );
          } else {
            jQuery( this ).YTPApplyFilter( filter, 0 );
            if( typeof callback == "function" ) callback( filter );
          }
      } );

    },
    /**
     *
     * @returns {*}
     */
    getFilters: function() {
      var YTPlayer = this.get( 0 );
      return YTPlayer.filters;
    },
    /**
     * MASK
     *
     *
     * @param mask
     * @returns {jQuery.mbYTPlayer}
     */
    addMask: function( mask ) {
      var YTPlayer = this.get( 0 );
      var overlay = YTPlayer.overlay;

      if( !mask ) {
        mask = YTPlayer.actualMask;
      }

      var tempImg = jQuery( "<img/>" ).attr( "src", mask ).on( "load", function() {

        overlay.CSSAnimate( {
          opacity: 0
        }, YTPlayer.opt.fadeOnStartTime, function() {

          YTPlayer.hasMask = true;

          tempImg.remove();

          overlay.css( {
            backgroundImage: "url(" + mask + ")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
            backgroundSize: "cover"
          } );

          overlay.CSSAnimate( {
            opacity: 1
          }, YTPlayer.opt.fadeOnStartTime );

        } );

      } );

      return this;

    },
    /**
     *
     * @returns {jQuery.mbYTPlayer}
     */
    removeMask: function() {
      var YTPlayer = this.get( 0 );
      var overlay = YTPlayer.overlay;
      overlay.CSSAnimate( {
        opacity: 0
      }, YTPlayer.opt.fadeOnStartTime, function() {

        YTPlayer.hasMask = false;

        overlay.css( {
          backgroundImage: "",
          backgroundRepeat: "",
          backgroundPosition: "",
          backgroundSize: ""
        } );
        overlay.CSSAnimate( {
          opacity: 1
        }, YTPlayer.opt.fadeOnStartTime );

      } );

      return this;

    },
    /**
     *
     * @param YTPlayer
     */
    applyMask: function( YTPlayer ) {
      var $YTPlayer = jQuery( YTPlayer );
      $YTPlayer.off( "YTPTime.mask" );

      if( YTPlayer.opt.mask ) {

        if( typeof YTPlayer.opt.mask == "string" ) {
          $YTPlayer.YTPAddMask( YTPlayer.opt.mask );

          YTPlayer.actualMask = YTPlayer.opt.mask;

        } else if( typeof YTPlayer.opt.mask == "object" ) {

          for( var time in YTPlayer.opt.mask ) {
            if( YTPlayer.opt.mask[ time ] )
              var img = jQuery( "<img/>" ).attr( "src", YTPlayer.opt.mask[ time ] );
          }

          if( YTPlayer.opt.mask[ 0 ] )
            $YTPlayer.YTPAddMask( YTPlayer.opt.mask[ 0 ] );

          $YTPlayer.on( "YTPTime.mask", function( e ) {
            for( var time in YTPlayer.opt.mask ) {
              if( e.time == time )
                if( !YTPlayer.opt.mask[ time ] ) {
                  $YTPlayer.YTPRemoveMask();
                } else {

                  $YTPlayer.YTPAddMask( YTPlayer.opt.mask[ time ] );
                  YTPlayer.actualMask = YTPlayer.opt.mask[ time ];
                }

            }
          } );

        }


      }
    },
    /**
     *
     */
    toggleMask: function() {
      var YTPlayer = this.get( 0 );
      var $YTPlayer = $( YTPlayer );
      if( YTPlayer.hasMask )
        $YTPlayer.YTPRemoveMask();
      else
        $YTPlayer.YTPAddMask();

      return this;
    },
    /**
     *
     * @returns {{totalTime: number, currentTime: number}}
     */
    manageProgress: function() {
      var YTPlayer = this.get( 0 );
      var controls = jQuery( "#controlBar_" + YTPlayer.id );
      var progressBar = controls.find( ".mb_YTPProgress" );
      var loadedBar = controls.find( ".mb_YTPLoaded" );
      var timeBar = controls.find( ".mb_YTPseekbar" );
      var totW = progressBar.outerWidth();
      var currentTime = Math.floor( YTPlayer.player.getCurrentTime() );
      var totalTime = Math.floor( YTPlayer.player.getDuration() );
      var timeW = ( currentTime * totW ) / totalTime;
      var startLeft = 0;
      var loadedW = YTPlayer.player.getVideoLoadedFraction() * 100;
      loadedBar.css( {
        left: startLeft,
        width: loadedW + "%"
      } );
      timeBar.css( {
        left: 0,
        width: timeW
      } );
      return {
        totalTime: totalTime,
        currentTime: currentTime
      };
    },
    /**
     *
     * @param YTPlayer
     */
    buildControls: function( YTPlayer ) {
      var data = YTPlayer.opt;
      // @data.printUrl: is deprecated; use data.showYTLogo
      data.showYTLogo = data.showYTLogo || data.printUrl;

      if( jQuery( "#controlBar_" + YTPlayer.id ).length )
        return;
      YTPlayer.controlBar = jQuery( "<span/>" ).attr( "id", "controlBar_" + YTPlayer.id ).addClass( "mb_YTPBar" ).css( {
        whiteSpace: "noWrap",
        position: YTPlayer.isBackground ? "fixed" : "absolute",
        zIndex: YTPlayer.isBackground ? 10000 : 1000
      } ).hide();
      var buttonBar = jQuery( "<div/>" ).addClass( "buttonBar" );
      /* play/pause button*/
      var playpause = jQuery( "<span>" + jQuery.mbYTPlayer.controls.play + "</span>" ).addClass( "mb_YTPPlaypause ytpicon" ).click( function() {
        if( YTPlayer.player.getPlayerState() == 1 ) jQuery( YTPlayer ).YTPPause();
        else jQuery( YTPlayer ).YTPPlay();
      } );
      /* mute/unmute button*/
      var MuteUnmute = jQuery( "<span>" + jQuery.mbYTPlayer.controls.mute + "</span>" ).addClass( "mb_YTPMuteUnmute ytpicon" ).click( function() {
        if( YTPlayer.player.getVolume() == 0 ) {
          jQuery( YTPlayer ).YTPUnmute();
        } else {
          jQuery( YTPlayer ).YTPMute();
        }
      } );
      /* volume bar*/
      var volumeBar = jQuery( "<div/>" ).addClass( "mb_YTPVolumeBar" ).css( {
        display: "inline-block"
      } );
      YTPlayer.volumeBar = volumeBar;
      /* time elapsed */
      var idx = jQuery( "<span/>" ).addClass( "mb_YTPTime" );
      var vURL = data.videoURL ? data.videoURL : "";
      if( vURL.indexOf( "http" ) < 0 ) vURL = jQuery.mbYTPlayer.locationProtocol + "//www.youtube.com/watch?v=" + data.videoURL;
      var movieUrl = jQuery( "<span/>" ).html( jQuery.mbYTPlayer.controls.ytLogo ).addClass( "mb_YTPUrl ytpicon" ).attr( "title", "view on YouTube" ).on( "click", function() {
        window.open( vURL, "viewOnYT" )
      } );
      var onlyVideo = jQuery( "<span/>" ).html( jQuery.mbYTPlayer.controls.onlyYT ).addClass( "mb_OnlyYT ytpicon" ).on( "click", function() {
        jQuery( YTPlayer ).YTPFullscreen( data.realfullscreen );
      } );
      var progressBar = jQuery( "<div/>" ).addClass( "mb_YTPProgress" ).css( "position", "absolute" ).click( function( e ) {
        timeBar.css( {
          width: ( e.clientX - timeBar.offset().left )
        } );
        YTPlayer.timeW = e.clientX - timeBar.offset().left;
        YTPlayer.controlBar.find( ".mb_YTPLoaded" ).css( {
          width: 0
        } );
        var totalTime = Math.floor( YTPlayer.player.getDuration() );
        YTPlayer.goto = ( timeBar.outerWidth() * totalTime ) / progressBar.outerWidth();
        YTPlayer.player.seekTo( parseFloat( YTPlayer.goto ), true );
        YTPlayer.controlBar.find( ".mb_YTPLoaded" ).css( {
          width: 0
        } );
      } );
      var loadedBar = jQuery( "<div/>" ).addClass( "mb_YTPLoaded" ).css( "position", "absolute" );
      var timeBar = jQuery( "<div/>" ).addClass( "mb_YTPseekbar" ).css( "position", "absolute" );
      progressBar.append( loadedBar ).append( timeBar );
      buttonBar.append( playpause ).append( MuteUnmute ).append( volumeBar ).append( idx );
      if( data.showYTLogo ) {
        buttonBar.append( movieUrl );
      }
      if( YTPlayer.isBackground || ( eval( YTPlayer.opt.realfullscreen ) && !YTPlayer.isBackground ) ) buttonBar.append( onlyVideo );
      YTPlayer.controlBar.append( buttonBar ).append( progressBar );
      if( !YTPlayer.isBackground ) {
        YTPlayer.controlBar.addClass( "inlinePlayer" );
        YTPlayer.wrapper.before( YTPlayer.controlBar );
      } else {
        jQuery( "body" ).after( YTPlayer.controlBar );
      }
      volumeBar.simpleSlider( {
        initialval: YTPlayer.opt.vol,
        scale: 100,
        orientation: "h",
        callback: function( el ) {
          if( el.value == 0 ) {
            jQuery( YTPlayer ).YTPMute();
          } else {
            jQuery( YTPlayer ).YTPUnmute();
          }
          YTPlayer.player.setVolume( el.value );
          if( !YTPlayer.isMute ) YTPlayer.opt.vol = el.value;
        }
      } );
    },
    /**
     *
     * @param YTPlayer
     */
    checkForState: function( YTPlayer ) {
      var interval = YTPlayer.opt.showControls ? 100 : 400;
      clearInterval( YTPlayer.getState );
      //Checking if player has been removed from scene
      if( !jQuery.contains( document, YTPlayer ) ) {
        jQuery( YTPlayer ).YTPPlayerDestroy();
        clearInterval( YTPlayer.getState );
        clearInterval( YTPlayer.checkForStartAt );
        return;
      }

      jQuery.mbYTPlayer.checkForStart( YTPlayer );

      YTPlayer.getState = setInterval( function() {
        var prog = jQuery( YTPlayer ).YTPManageProgress();
        var $YTPlayer = jQuery( YTPlayer );
        var data = YTPlayer.opt;
        var startAt = YTPlayer.opt.startAt ? YTPlayer.opt.startAt : 1;
        var stopAt = YTPlayer.opt.stopAt > YTPlayer.opt.startAt ? YTPlayer.opt.stopAt : 0;
        stopAt = stopAt < YTPlayer.player.getDuration() ? stopAt : 0;
        if( YTPlayer.currentTime != prog.currentTime ) {

          var YTPEvent = jQuery.Event( "YTPTime" );
          YTPEvent.time = YTPlayer.currentTime;
          jQuery( YTPlayer ).trigger( YTPEvent );

        }
        YTPlayer.currentTime = prog.currentTime;
        YTPlayer.totalTime = YTPlayer.player.getDuration();
        if( YTPlayer.player.getVolume() == 0 ) $YTPlayer.addClass( "isMuted" );
        else $YTPlayer.removeClass( "isMuted" );

        if( YTPlayer.opt.showControls )
          if( prog.totalTime ) {
            YTPlayer.controlBar.find( ".mb_YTPTime" ).html( jQuery.mbYTPlayer.formatTime( prog.currentTime ) + " / " + jQuery.mbYTPlayer.formatTime( prog.totalTime ) );
          } else {
            YTPlayer.controlBar.find( ".mb_YTPTime" ).html( "-- : -- / -- : --" );
          }

        if( eval( YTPlayer.opt.stopMovieOnBlur ) ) {
          if( !document.hasFocus() ) {
            if( YTPlayer.state == 1 ) {
              YTPlayer.hasFocus = false;
              $YTPlayer.YTPPause();
            }
          } else if( document.hasFocus() && !YTPlayer.hasFocus && !( YTPlayer.state == -1 || YTPlayer.state == 0 ) ) {
            YTPlayer.hasFocus = true;
            $YTPlayer.YTPPlay();
          }
        }

        if( YTPlayer.controlBar.length && YTPlayer.controlBar.outerWidth() <= 400 && !YTPlayer.isCompact ) {
          YTPlayer.controlBar.addClass( "compact" );
          YTPlayer.isCompact = true;
          if( !YTPlayer.isMute && YTPlayer.volumeBar ) YTPlayer.volumeBar.updateSliderVal( YTPlayer.opt.vol );
        } else if( YTPlayer.controlBar.length && YTPlayer.controlBar.outerWidth() > 400 && YTPlayer.isCompact ) {
          YTPlayer.controlBar.removeClass( "compact" );
          YTPlayer.isCompact = false;
          if( !YTPlayer.isMute && YTPlayer.volumeBar ) YTPlayer.volumeBar.updateSliderVal( YTPlayer.opt.vol );
        }
        if( YTPlayer.player.getPlayerState() == 1 && ( parseFloat( YTPlayer.player.getDuration() - 1.5 ) < YTPlayer.player.getCurrentTime() || ( stopAt > 0 && parseFloat( YTPlayer.player.getCurrentTime() ) > stopAt ) ) ) {
          if( YTPlayer.isEnded ) return;
          YTPlayer.isEnded = true;
          setTimeout( function() {
            YTPlayer.isEnded = false
          }, 1000 );

          if( YTPlayer.isPlayList ) {

            if( !data.loop || ( data.loop > 0 && YTPlayer.player.loopTime === data.loop - 1 ) ) {

              YTPlayer.player.loopTime = undefined;
              clearInterval( YTPlayer.getState );
              var YTPEnd = jQuery.Event( "YTPEnd" );
              YTPEnd.time = YTPlayer.currentTime;
              jQuery( YTPlayer ).trigger( YTPEnd );
              //YTPlayer.state = 0;

              return;
            }

          } else if( !data.loop || ( data.loop > 0 && YTPlayer.player.loopTime === data.loop - 1 ) ) {

            YTPlayer.player.loopTime = undefined;
            YTPlayer.preventTrigger = true;
            YTPlayer.state = 2;
            jQuery( YTPlayer ).YTPPause();

            YTPlayer.wrapper.CSSAnimate( {
              opacity: 0
            }, YTPlayer.opt.fadeOnStartTime, function() {

              if( YTPlayer.controlBar.length )
                YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );

              var YTPEnd = jQuery.Event( "YTPEnd" );
              YTPEnd.time = YTPlayer.currentTime;
              jQuery( YTPlayer ).trigger( YTPEnd );

              YTPlayer.player.seekTo( startAt, true );
              if( !YTPlayer.isBackground ) {
                if( YTPlayer.opt.backgroundUrl && YTPlayer.isPlayer ) {
                  YTPlayer.opt.backgroundUrl = YTPlayer.opt.backgroundUrl || YTPlayer.orig_background;
                  YTPlayer.opt.containment.css( {
                    background: "url(" + YTPlayer.opt.backgroundUrl + ") center center",
                    backgroundSize: "cover"
                  } );
                }
              } else {
                if( YTPlayer.orig_background )
                  jQuery( YTPlayer ).css( "background-image", YTPlayer.orig_background );
              }
            } );

            return;

          }

          YTPlayer.player.loopTime = YTPlayer.player.loopTime ? ++YTPlayer.player.loopTime : 1;
          startAt = startAt || 1;
          YTPlayer.preventTrigger = true;
          YTPlayer.state = 2;
          jQuery( YTPlayer ).YTPPause();
          YTPlayer.player.seekTo( startAt, true );
          $YTPlayer.YTPPlay();


        }
      }, interval );
    },
    /**
     *
     * @returns {string} time
     */
    getTime: function() {
      var YTPlayer = this.get( 0 );
      return jQuery.mbYTPlayer.formatTime( YTPlayer.currentTime );
    },
    /**
     *
     * @returns {string} total time
     */
    getTotalTime: function() {
      var YTPlayer = this.get( 0 );
      return jQuery.mbYTPlayer.formatTime( YTPlayer.totalTime );
    },
    /**
     *
     * @param YTPlayer
     */
    checkForStart: function( YTPlayer ) {

      var $YTPlayer = jQuery( YTPlayer );

      //Checking if player has been removed from scene
      if( !jQuery.contains( document, YTPlayer ) ) {
        jQuery( YTPlayer ).YTPPlayerDestroy();
        return
      }

      /*
       if( jQuery.browser.chrome )
       YTPlayer.opt.quality = "default";
       */

      YTPlayer.preventTrigger = true;
      YTPlayer.state = 2;
      jQuery( YTPlayer ).YTPPause();

      jQuery( YTPlayer ).muteYTPVolume();
      jQuery( "#controlBar_" + YTPlayer.id ).remove();

      YTPlayer.controlBar = false;

      if( YTPlayer.opt.showControls )
        jQuery.mbYTPlayer.buildControls( YTPlayer );

      if( YTPlayer.opt.addRaster ) {

        var classN = YTPlayer.opt.addRaster == "dot" ? "raster-dot" : "raster";
        YTPlayer.overlay.addClass( YTPlayer.isRetina ? classN + " retina" : classN );

      } else {

        YTPlayer.overlay.removeClass( function( index, classNames ) {
          // change the list into an array
          var current_classes = classNames.split( " " ),
            // array of classes which are to be removed
            classes_to_remove = [];
          jQuery.each( current_classes, function( index, class_name ) {
            // if the classname begins with bg add it to the classes_to_remove array
            if( /raster.*/.test( class_name ) ) {
              classes_to_remove.push( class_name );
            }
          } );
          classes_to_remove.push( "retina" );
          // turn the array back into a string
          return classes_to_remove.join( " " );
        } )

      }

      var startAt = YTPlayer.opt.startAt ? YTPlayer.opt.startAt : 1;
      YTPlayer.player.playVideo();
      YTPlayer.player.seekTo( startAt, true );

      YTPlayer.checkForStartAt = setInterval( function() {

        jQuery( YTPlayer ).YTPMute();

        var canPlayVideo = YTPlayer.player.getVideoLoadedFraction() >= startAt / YTPlayer.player.getDuration();

        if( YTPlayer.player.getDuration() > 0 && YTPlayer.player.getCurrentTime() >= startAt && canPlayVideo ) {

          //YTPlayer.player.playVideo();
          //console.timeEnd( "checkforStart" );

          clearInterval( YTPlayer.checkForStartAt );

          if( typeof YTPlayer.opt.onReady == "function" )
            YTPlayer.opt.onReady( YTPlayer );

          YTPlayer.isReady = true;
          var YTPready = jQuery.Event( "YTPReady" );
          YTPready.time = YTPlayer.currentTime;
          jQuery( YTPlayer ).trigger( YTPready );


          YTPlayer.preventTrigger = true;
          YTPlayer.state = 2;
          jQuery( YTPlayer ).YTPPause();

          if( !YTPlayer.opt.mute ) jQuery( YTPlayer ).YTPUnmute();
          YTPlayer.canTrigger = true;

          if( YTPlayer.opt.autoPlay ) {


            var YTPStart = jQuery.Event( "YTPStart" );
            YTPStart.time = YTPlayer.currentTime;
            jQuery( YTPlayer ).trigger( YTPStart );

            jQuery( YTPlayer.playerEl ).CSSAnimate( {
              opacity: 1
            }, 1000 );

            $YTPlayer.YTPPlay();

            YTPlayer.wrapper.CSSAnimate( {
              opacity: YTPlayer.isAlone ? 1 : YTPlayer.opt.opacity
            }, YTPlayer.opt.fadeOnStartTime );

            /* Fix for Safari freeze */
            if( jQuery.browser.safari ) {

              YTPlayer.safariPlay = setInterval( function() {

                if( YTPlayer.state != 1 )
                  $YTPlayer.YTPPlay();
                else
                  clearInterval( YTPlayer.safariPlay )
              }, 10 )
            }
            $YTPlayer.on( "YTPReady", function() {
              $YTPlayer.YTPPlay();
            } );

          } else {

            //$YTPlayer.YTPPause();
            YTPlayer.player.pauseVideo();
            if( !YTPlayer.isPlayer ) {
              jQuery( YTPlayer.playerEl ).CSSAnimate( {
                opacity: 1
              }, YTPlayer.opt.fadeOnStartTime );

              YTPlayer.wrapper.CSSAnimate( {
                opacity: YTPlayer.isAlone ? 1 : YTPlayer.opt.opacity
              }, YTPlayer.opt.fadeOnStartTime );
            }

            if( YTPlayer.controlBar.length )
              YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );

          }

          if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay && ( YTPlayer.loading && YTPlayer.loading.length ) ) {
            YTPlayer.loading.html( "Ready" );
            setTimeout( function() {
              YTPlayer.loading.fadeOut();
            }, 100 )
          }

          if( YTPlayer.controlBar && YTPlayer.controlBar.length )
            YTPlayer.controlBar.slideDown( 1000 );

        } else if( jQuery.browser.safari ) {
          YTPlayer.player.playVideo();
          if( startAt >= 0 ) YTPlayer.player.seekTo( startAt, true );
        }

      }, 1 );

    },
    /**
     *
     * @param anchor
     */
    setAnchor: function( anchor ) {
      var $YTplayer = this;

      $YTplayer.optimizeDisplay( anchor );
    },
    /**
     *
     * @param anchor
     */
    getAnchor: function() {
      var YTPlayer = this.get( 0 );
      return YTPlayer.opt.anchor;
    },
    /**
     *
     * @param s
     * @returns {string}
     */
    formatTime: function( s ) {
      var min = Math.floor( s / 60 );
      var sec = Math.floor( s - ( 60 * min ) );
      return( min <= 9 ? "0" + min : min ) + " : " + ( sec <= 9 ? "0" + sec : sec );
    }
  };

  /**
   *
   * @param anchor
   * can be center, top, bottom, right, left; (default is center,center)
   */
  jQuery.fn.optimizeDisplay = function( anchor ) {
    var YTPlayer = this.get( 0 );
    var playerBox = jQuery( YTPlayer.playerEl );
    var vid = {};

    YTPlayer.opt.anchor = anchor || YTPlayer.opt.anchor;

    YTPlayer.opt.anchor = typeof YTPlayer.opt.anchor != "undefined " ? YTPlayer.opt.anchor : "center,center";
    var YTPAlign = YTPlayer.opt.anchor.split( "," );

    //data.optimizeDisplay = YTPlayer.isPlayer ? false : data.optimizeDisplay;

    if( YTPlayer.opt.optimizeDisplay ) {
      var abundance = YTPlayer.isPlayer ? 0 : 80;
      var win = {};
      var el = YTPlayer.wrapper;

      win.width = el.outerWidth();
      win.height = el.outerHeight() + abundance;

      vid.width = win.width;
      vid.height = YTPlayer.opt.ratio == "16/9" ? Math.ceil( vid.width * ( 9 / 16 ) ) : Math.ceil( vid.width * ( 3 / 4 ) );

      vid.marginTop = -( ( vid.height - win.height ) / 2 );
      vid.marginLeft = 0;

      var lowest = vid.height < win.height;

      if( lowest ) {

        vid.height = win.height;
        vid.width = YTPlayer.opt.ratio == "16/9" ? Math.floor( vid.height * ( 16 / 9 ) ) : Math.floor( vid.height * ( 4 / 3 ) );

        vid.marginTop = 0;
        vid.marginLeft = -( ( vid.width - win.width ) / 2 );

      }

      for( var a in YTPAlign ) {

        if( YTPAlign.hasOwnProperty( a ) ) {

          var al = YTPAlign[ a ].replace( / /g, "" );

          switch( al ) {

            case "top":
              vid.marginTop = lowest ? -( ( vid.height - win.height ) / 2 ) : 0;
              break;

            case "bottom":
              vid.marginTop = lowest ? 0 : -( vid.height - ( win.height ) );
              break;

            case "left":
              vid.marginLeft = 0;
              break;

            case "right":
              vid.marginLeft = lowest ? -( vid.width - win.width ) : 0;
              break;

            default:
              if( vid.width > win.width )
                vid.marginLeft = -( ( vid.width - win.width ) / 2 );
              break;
          }

        }

      }

    } else {
      vid.width = "100%";
      vid.height = "100%";
      vid.marginTop = 0;
      vid.marginLeft = 0;
    }

    playerBox.css( {
      width: vid.width,
      height: vid.height,
      marginTop: vid.marginTop,
      marginLeft: vid.marginLeft,
      maxWidth: "initial"
    } );

  };
  /**
   *
   * @param arr
   * @returns {Array|string|Blob|*}
   *
   */
  jQuery.shuffle = function( arr ) {
    var newArray = arr.slice();
    var len = newArray.length;
    var i = len;
    while( i-- ) {
      var p = parseInt( Math.random() * len );
      var t = newArray[ i ];
      newArray[ i ] = newArray[ p ];
      newArray[ p ] = t;
    }
    return newArray;
  };

  jQuery.fn.unselectable = function() {
    return this.each( function() {
      jQuery( this ).css( {
        "-moz-user-select": "none",
        "-webkit-user-select": "none",
        "user-select": "none"
      } ).attr( "unselectable", "on" );
    } );
  };


  /* Exposed public method */
  jQuery.fn.YTPlayer = jQuery.mbYTPlayer.buildPlayer;
  jQuery.fn.YTPGetPlayer = jQuery.mbYTPlayer.getPlayer;
  jQuery.fn.YTPGetVideoID = jQuery.mbYTPlayer.getVideoID;
  jQuery.fn.YTPChangeMovie = jQuery.mbYTPlayer.changeMovie;
  jQuery.fn.YTPPlayerDestroy = jQuery.mbYTPlayer.playerDestroy;

  jQuery.fn.YTPPlay = jQuery.mbYTPlayer.play;
  jQuery.fn.YTPTogglePlay = jQuery.mbYTPlayer.togglePlay;
  jQuery.fn.YTPStop = jQuery.mbYTPlayer.stop;
  jQuery.fn.YTPPause = jQuery.mbYTPlayer.pause;
  jQuery.fn.YTPSeekTo = jQuery.mbYTPlayer.seekTo;

  jQuery.fn.YTPlaylist = jQuery.mbYTPlayer.playlist;
  jQuery.fn.YTPPlayNext = jQuery.mbYTPlayer.playNext;
  jQuery.fn.YTPPlayPrev = jQuery.mbYTPlayer.playPrev;
  jQuery.fn.YTPPlayIndex = jQuery.mbYTPlayer.playIndex;

  jQuery.fn.YTPMute = jQuery.mbYTPlayer.mute;
  jQuery.fn.YTPUnmute = jQuery.mbYTPlayer.unmute;
  jQuery.fn.YTPToggleVolume = jQuery.mbYTPlayer.toggleVolume;
  jQuery.fn.YTPSetVolume = jQuery.mbYTPlayer.setVolume;

  jQuery.fn.YTPGetVideoData = jQuery.mbYTPlayer.getVideoData;
  jQuery.fn.YTPFullscreen = jQuery.mbYTPlayer.fullscreen;
  jQuery.fn.YTPToggleLoops = jQuery.mbYTPlayer.toggleLoops;
  jQuery.fn.YTPSetVideoQuality = jQuery.mbYTPlayer.setVideoQuality;
  jQuery.fn.YTPManageProgress = jQuery.mbYTPlayer.manageProgress;

  jQuery.fn.YTPApplyFilter = jQuery.mbYTPlayer.applyFilter;
  jQuery.fn.YTPApplyFilters = jQuery.mbYTPlayer.applyFilters;
  jQuery.fn.YTPToggleFilter = jQuery.mbYTPlayer.toggleFilter;
  jQuery.fn.YTPToggleFilters = jQuery.mbYTPlayer.toggleFilters;
  jQuery.fn.YTPRemoveFilter = jQuery.mbYTPlayer.removeFilter;
  jQuery.fn.YTPDisableFilters = jQuery.mbYTPlayer.disableFilters;
  jQuery.fn.YTPEnableFilters = jQuery.mbYTPlayer.enableFilters;
  jQuery.fn.YTPGetFilters = jQuery.mbYTPlayer.getFilters;

  jQuery.fn.YTPGetTime = jQuery.mbYTPlayer.getTime;
  jQuery.fn.YTPGetTotalTime = jQuery.mbYTPlayer.getTotalTime;

  jQuery.fn.YTPAddMask = jQuery.mbYTPlayer.addMask;
  jQuery.fn.YTPRemoveMask = jQuery.mbYTPlayer.removeMask;
  jQuery.fn.YTPToggleMask = jQuery.mbYTPlayer.toggleMask;

  jQuery.fn.YTPSetAnchor = jQuery.mbYTPlayer.setAnchor;
  jQuery.fn.YTPGetAnchor = jQuery.mbYTPlayer.getAnchor;

  /**
   *
   * @deprecated
   * todo: Above methods will be removed with version 3.5.0
   *
   **/
  jQuery.fn.mb_YTPlayer = jQuery.mbYTPlayer.buildPlayer;
  jQuery.fn.playNext = jQuery.mbYTPlayer.playNext;
  jQuery.fn.playPrev = jQuery.mbYTPlayer.playPrev;
  jQuery.fn.changeMovie = jQuery.mbYTPlayer.changeMovie;
  jQuery.fn.getVideoID = jQuery.mbYTPlayer.getVideoID;
  jQuery.fn.getPlayer = jQuery.mbYTPlayer.getPlayer;
  jQuery.fn.playerDestroy = jQuery.mbYTPlayer.playerDestroy;
  jQuery.fn.fullscreen = jQuery.mbYTPlayer.fullscreen;
  jQuery.fn.buildYTPControls = jQuery.mbYTPlayer.buildControls;
  jQuery.fn.playYTP = jQuery.mbYTPlayer.play;
  jQuery.fn.toggleLoops = jQuery.mbYTPlayer.toggleLoops;
  jQuery.fn.stopYTP = jQuery.mbYTPlayer.stop;
  jQuery.fn.pauseYTP = jQuery.mbYTPlayer.pause;
  jQuery.fn.seekToYTP = jQuery.mbYTPlayer.seekTo;
  jQuery.fn.muteYTPVolume = jQuery.mbYTPlayer.mute;
  jQuery.fn.unmuteYTPVolume = jQuery.mbYTPlayer.unmute;
  jQuery.fn.setYTPVolume = jQuery.mbYTPlayer.setVolume;
  jQuery.fn.setVideoQuality = jQuery.mbYTPlayer.setVideoQuality;
  jQuery.fn.manageYTPProgress = jQuery.mbYTPlayer.manageProgress;
  jQuery.fn.YTPGetDataFromFeed = jQuery.mbYTPlayer.getVideoData;


} )( jQuery, ytp );
;
/*
 * ******************************************************************************
 *  jquery.mb.components
 *  file: jquery.mb.CSSAnimate.min.js
 *
 *  Copyright (c) 2001-2014. Matteo Bicocchi (Pupunzi);
 *  Open lab srl, Firenze - Italy
 *  email: matteo@open-lab.com
 *  site:   http://pupunzi.com
 *  blog: http://pupunzi.open-lab.com
 *  http://open-lab.com
 *
 *  Licences: MIT, GPL
 *  http://www.opensource.org/licenses/mit-license.php
 *  http://www.gnu.org/licenses/gpl.html
 *
 *  last modified: 26/03/14 21.40
 *  *****************************************************************************
 */

function uncamel(e){return e.replace(/([A-Z])/g,function(e){return"-"+e.toLowerCase()})}function setUnit(e,t){return"string"!=typeof e||e.match(/^[\-0-9\.]+jQuery/)?""+e+t:e}function setFilter(e,t,r){var i=uncamel(t),n=jQuery.browser.mozilla?"":jQuery.CSS.sfx;e[n+"filter"]=e[n+"filter"]||"",r=setUnit(r>jQuery.CSS.filters[t].max?jQuery.CSS.filters[t].max:r,jQuery.CSS.filters[t].unit),e[n+"filter"]+=i+"("+r+") ",delete e[t]}jQuery.support.CSStransition=function(){var e=document.body||document.documentElement,t=e.style;return void 0!==t.transition||void 0!==t.WebkitTransition||void 0!==t.MozTransition||void 0!==t.MsTransition||void 0!==t.OTransition}(),jQuery.CSS={name:"mb.CSSAnimate",author:"Matteo Bicocchi",version:"2.0.0",transitionEnd:"transitionEnd",sfx:"",filters:{blur:{min:0,max:100,unit:"px"},brightness:{min:0,max:400,unit:"%"},contrast:{min:0,max:400,unit:"%"},grayscale:{min:0,max:100,unit:"%"},hueRotate:{min:0,max:360,unit:"deg"},invert:{min:0,max:100,unit:"%"},saturate:{min:0,max:400,unit:"%"},sepia:{min:0,max:100,unit:"%"}},normalizeCss:function(e){var t=jQuery.extend(!0,{},e);jQuery.browser.webkit||jQuery.browser.opera?jQuery.CSS.sfx="-webkit-":jQuery.browser.mozilla?jQuery.CSS.sfx="-moz-":jQuery.browser.msie&&(jQuery.CSS.sfx="-ms-");for(var r in t){"transform"===r&&(t[jQuery.CSS.sfx+"transform"]=t[r],delete t[r]),"transform-origin"===r&&(t[jQuery.CSS.sfx+"transform-origin"]=e[r],delete t[r]),"filter"!==r||jQuery.browser.mozilla||(t[jQuery.CSS.sfx+"filter"]=e[r],delete t[r]),"blur"===r&&setFilter(t,"blur",e[r]),"brightness"===r&&setFilter(t,"brightness",e[r]),"contrast"===r&&setFilter(t,"contrast",e[r]),"grayscale"===r&&setFilter(t,"grayscale",e[r]),"hueRotate"===r&&setFilter(t,"hueRotate",e[r]),"invert"===r&&setFilter(t,"invert",e[r]),"saturate"===r&&setFilter(t,"saturate",e[r]),"sepia"===r&&setFilter(t,"sepia",e[r]);var i="";"x"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" translateX("+setUnit(e[r],"px")+")",delete t[r]),"y"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" translateY("+setUnit(e[r],"px")+")",delete t[r]),"z"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" translateZ("+setUnit(e[r],"px")+")",delete t[r]),"rotate"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" rotate("+setUnit(e[r],"deg")+")",delete t[r]),"rotateX"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" rotateX("+setUnit(e[r],"deg")+")",delete t[r]),"rotateY"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" rotateY("+setUnit(e[r],"deg")+")",delete t[r]),"rotateZ"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" rotateZ("+setUnit(e[r],"deg")+")",delete t[r]),"scale"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" scale("+setUnit(e[r],"")+")",delete t[r]),"scaleX"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" scaleX("+setUnit(e[r],"")+")",delete t[r]),"scaleY"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" scaleY("+setUnit(e[r],"")+")",delete t[r]),"scaleZ"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" scaleZ("+setUnit(e[r],"")+")",delete t[r]),"skew"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" skew("+setUnit(e[r],"deg")+")",delete t[r]),"skewX"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" skewX("+setUnit(e[r],"deg")+")",delete t[r]),"skewY"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" skewY("+setUnit(e[r],"deg")+")",delete t[r]),"perspective"===r&&(i=jQuery.CSS.sfx+"transform",t[i]=t[i]||"",t[i]+=" perspective("+setUnit(e[r],"px")+")",delete t[r])}return t},getProp:function(e){var t=[];for(var r in e)t.indexOf(r)<0&&t.push(uncamel(r));return t.join(",")},animate:function(e,t,r,i,n){return this.each(function(){function s(){u.called=!0,u.CSSAIsRunning=!1,a.off(jQuery.CSS.transitionEnd+"."+u.id),clearTimeout(u.timeout),a.css(jQuery.CSS.sfx+"transition",""),"function"==typeof n&&n.apply(u),"function"==typeof u.CSSqueue&&(u.CSSqueue(),u.CSSqueue=null)}var u=this,a=jQuery(this);u.id=u.id||"CSSA_"+(new Date).getTime();var o=o||{type:"noEvent"};if(u.CSSAIsRunning&&u.eventType==o.type&&!jQuery.browser.msie&&jQuery.browser.version<=9)return void(u.CSSqueue=function(){a.CSSAnimate(e,t,r,i,n)});if(u.CSSqueue=null,u.eventType=o.type,0!==a.length&&e){if(e=jQuery.normalizeCss(e),u.CSSAIsRunning=!0,"function"==typeof t&&(n=t,t=jQuery.fx.speeds._default),"function"==typeof r&&(i=r,r=0),"string"==typeof r&&(n=r,r=0),"function"==typeof i&&(n=i,i="cubic-bezier(0.65,0.03,0.36,0.72)"),"string"==typeof t)for(var f in jQuery.fx.speeds){if(t==f){t=jQuery.fx.speeds[f];break}t=jQuery.fx.speeds._default}if(t||(t=jQuery.fx.speeds._default),"string"==typeof n&&(i=n,n=null),!jQuery.support.CSStransition){for(var c in e){if("transform"===c&&delete e[c],"filter"===c&&delete e[c],"transform-origin"===c&&delete e[c],"auto"===e[c]&&delete e[c],"x"===c){var S=e[c],l="left";e[l]=S,delete e[c]}if("y"===c){var S=e[c],l="top";e[l]=S,delete e[c]}("-ms-transform"===c||"-ms-filter"===c)&&delete e[c]}return void a.delay(r).animate(e,t,n)}var y={"default":"ease","in":"ease-in",out:"ease-out","in-out":"ease-in-out",snap:"cubic-bezier(0,1,.5,1)",easeOutCubic:"cubic-bezier(.215,.61,.355,1)",easeInOutCubic:"cubic-bezier(.645,.045,.355,1)",easeInCirc:"cubic-bezier(.6,.04,.98,.335)",easeOutCirc:"cubic-bezier(.075,.82,.165,1)",easeInOutCirc:"cubic-bezier(.785,.135,.15,.86)",easeInExpo:"cubic-bezier(.95,.05,.795,.035)",easeOutExpo:"cubic-bezier(.19,1,.22,1)",easeInOutExpo:"cubic-bezier(1,0,0,1)",easeInQuad:"cubic-bezier(.55,.085,.68,.53)",easeOutQuad:"cubic-bezier(.25,.46,.45,.94)",easeInOutQuad:"cubic-bezier(.455,.03,.515,.955)",easeInQuart:"cubic-bezier(.895,.03,.685,.22)",easeOutQuart:"cubic-bezier(.165,.84,.44,1)",easeInOutQuart:"cubic-bezier(.77,0,.175,1)",easeInQuint:"cubic-bezier(.755,.05,.855,.06)",easeOutQuint:"cubic-bezier(.23,1,.32,1)",easeInOutQuint:"cubic-bezier(.86,0,.07,1)",easeInSine:"cubic-bezier(.47,0,.745,.715)",easeOutSine:"cubic-bezier(.39,.575,.565,1)",easeInOutSine:"cubic-bezier(.445,.05,.55,.95)",easeInBack:"cubic-bezier(.6,-.28,.735,.045)",easeOutBack:"cubic-bezier(.175, .885,.32,1.275)",easeInOutBack:"cubic-bezier(.68,-.55,.265,1.55)"};y[i]&&(i=y[i]),a.off(jQuery.CSS.transitionEnd+"."+u.id);var m=jQuery.CSS.getProp(e),d={};jQuery.extend(d,e),d[jQuery.CSS.sfx+"transition-property"]=m,d[jQuery.CSS.sfx+"transition-duration"]=t+"ms",d[jQuery.CSS.sfx+"transition-delay"]=r+"ms",d[jQuery.CSS.sfx+"transition-timing-function"]=i,setTimeout(function(){a.one(jQuery.CSS.transitionEnd+"."+u.id,s),a.css(d)},1),u.timeout=setTimeout(function(){return u.called||!n?(u.called=!1,void(u.CSSAIsRunning=!1)):(a.css(jQuery.CSS.sfx+"transition",""),n.apply(u),u.CSSAIsRunning=!1,void("function"==typeof u.CSSqueue&&(u.CSSqueue(),u.CSSqueue=null)))},t+r+10)}})}},jQuery.fn.CSSAnimate=jQuery.CSS.animate,jQuery.normalizeCss=jQuery.CSS.normalizeCss,jQuery.fn.css3=function(e){return this.each(function(){var t=jQuery(this),r=jQuery.normalizeCss(e);t.css(r)})};
;/*___________________________________________________________________________________________________________________________________________________
 _ jquery.mb.components                                                                                                                             _
 _                                                                                                                                                  _
 _ file: jquery.mb.browser.min.js                                                                                                                   _
 _ last modified: 07/06/16 22.34                                                                                                                    _
 _                                                                                                                                                  _
 _ Open Lab s.r.l., Florence - Italy                                                                                                                _
 _                                                                                                                                                  _
 _ email: matteo@open-lab.com                                                                                                                       _
 _ site: http://pupunzi.com                                                                                                                         _
 _       http://open-lab.com                                                                                                                        _
 _ blog: http://pupunzi.open-lab.com                                                                                                                _
 _ Q&A:  http://jquery.pupunzi.com                                                                                                                  _
 _                                                                                                                                                  _
 _ Licences: MIT, GPL                                                                                                                               _
 _    http://www.opensource.org/licenses/mit-license.php                                                                                            _
 _    http://www.gnu.org/licenses/gpl.html                                                                                                          _
 _                                                                                                                                                  _
 _ Copyright (c) 2001-2016. Matteo Bicocchi (Pupunzi);                                                                                              _
 ___________________________________________________________________________________________________________________________________________________*/

var nAgt=navigator.userAgent;if(!jQuery.browser){jQuery.browser={},jQuery.browser.mozilla=!1,jQuery.browser.webkit=!1,jQuery.browser.opera=!1,jQuery.browser.safari=!1,jQuery.browser.chrome=!1,jQuery.browser.androidStock=!1,jQuery.browser.msie=!1,jQuery.browser.ua=nAgt,jQuery.browser.name=navigator.appName,jQuery.browser.fullVersion=""+parseFloat(navigator.appVersion),jQuery.browser.majorVersion=parseInt(navigator.appVersion,10);var nameOffset,verOffset,ix;if(-1!=(verOffset=nAgt.indexOf("Opera")))jQuery.browser.opera=!0,jQuery.browser.name="Opera",jQuery.browser.fullVersion=nAgt.substring(verOffset+6),-1!=(verOffset=nAgt.indexOf("Version"))&&(jQuery.browser.fullVersion=nAgt.substring(verOffset+8));else if(-1!=(verOffset=nAgt.indexOf("OPR")))jQuery.browser.opera=!0,jQuery.browser.name="Opera",jQuery.browser.fullVersion=nAgt.substring(verOffset+4);else if(-1!=(verOffset=nAgt.indexOf("MSIE")))jQuery.browser.msie=!0,jQuery.browser.name="Microsoft Internet Explorer",jQuery.browser.fullVersion=nAgt.substring(verOffset+5);else if(-1!=nAgt.indexOf("Trident")||-1!=nAgt.indexOf("Edge")){jQuery.browser.msie=!0,jQuery.browser.name="Microsoft Internet Explorer";var start=nAgt.indexOf("rv:")+3,end=start+4;jQuery.browser.fullVersion=nAgt.substring(start,end)}else-1!=(verOffset=nAgt.indexOf("Chrome"))?(jQuery.browser.webkit=!0,jQuery.browser.chrome=!0,jQuery.browser.name="Chrome",jQuery.browser.fullVersion=nAgt.substring(verOffset+7)):nAgt.indexOf("mozilla/5.0")>-1&&nAgt.indexOf("android ")>-1&&nAgt.indexOf("applewebkit")>-1&&!(nAgt.indexOf("chrome")>-1)?(verOffset=nAgt.indexOf("Chrome"),jQuery.browser.webkit=!0,jQuery.browser.androidStock=!0,jQuery.browser.name="androidStock",jQuery.browser.fullVersion=nAgt.substring(verOffset+7)):-1!=(verOffset=nAgt.indexOf("Safari"))?(jQuery.browser.webkit=!0,jQuery.browser.safari=!0,jQuery.browser.name="Safari",jQuery.browser.fullVersion=nAgt.substring(verOffset+7),-1!=(verOffset=nAgt.indexOf("Version"))&&(jQuery.browser.fullVersion=nAgt.substring(verOffset+8))):-1!=(verOffset=nAgt.indexOf("AppleWebkit"))?(jQuery.browser.webkit=!0,jQuery.browser.safari=!0,jQuery.browser.name="Safari",jQuery.browser.fullVersion=nAgt.substring(verOffset+7),-1!=(verOffset=nAgt.indexOf("Version"))&&(jQuery.browser.fullVersion=nAgt.substring(verOffset+8))):-1!=(verOffset=nAgt.indexOf("Firefox"))?(jQuery.browser.mozilla=!0,jQuery.browser.name="Firefox",jQuery.browser.fullVersion=nAgt.substring(verOffset+8)):(nameOffset=nAgt.lastIndexOf(" ")+1)<(verOffset=nAgt.lastIndexOf("/"))&&(jQuery.browser.name=nAgt.substring(nameOffset,verOffset),jQuery.browser.fullVersion=nAgt.substring(verOffset+1),jQuery.browser.name.toLowerCase()==jQuery.browser.name.toUpperCase()&&(jQuery.browser.name=navigator.appName));-1!=(ix=jQuery.browser.fullVersion.indexOf(";"))&&(jQuery.browser.fullVersion=jQuery.browser.fullVersion.substring(0,ix)),-1!=(ix=jQuery.browser.fullVersion.indexOf(" "))&&(jQuery.browser.fullVersion=jQuery.browser.fullVersion.substring(0,ix)),jQuery.browser.majorVersion=parseInt(""+jQuery.browser.fullVersion,10),isNaN(jQuery.browser.majorVersion)&&(jQuery.browser.fullVersion=""+parseFloat(navigator.appVersion),jQuery.browser.majorVersion=parseInt(navigator.appVersion,10)),jQuery.browser.version=jQuery.browser.majorVersion}jQuery.browser.android=/Android/i.test(nAgt),jQuery.browser.blackberry=/BlackBerry|BB|PlayBook/i.test(nAgt),jQuery.browser.ios=/iPhone|iPad|iPod|webOS/i.test(nAgt),jQuery.browser.operaMobile=/Opera Mini/i.test(nAgt),jQuery.browser.windowsMobile=/IEMobile|Windows Phone/i.test(nAgt),jQuery.browser.kindle=/Kindle|Silk/i.test(nAgt),jQuery.browser.mobile=jQuery.browser.android||jQuery.browser.blackberry||jQuery.browser.ios||jQuery.browser.windowsMobile||jQuery.browser.operaMobile||jQuery.browser.kindle,jQuery.isMobile=jQuery.browser.mobile,jQuery.isTablet=jQuery.browser.mobile&&jQuery(window).width()>765,jQuery.isAndroidDefault=jQuery.browser.android&&!/chrome/i.test(nAgt);
;/*___________________________________________________________________________________________________________________________________________________
 _ jquery.mb.components                                                                                                                             _
 _                                                                                                                                                  _
 _ file: jquery.mb.simpleSlider.min.js                                                                                                              _
 _ last modified: 16/05/15 23.45                                                                                                                    _
 _                                                                                                                                                  _
 _ Open Lab s.r.l., Florence - Italy                                                                                                                _
 _                                                                                                                                                  _
 _ email: matteo@open-lab.com                                                                                                                       _
 _ site: http://pupunzi.com                                                                                                                         _
 _       http://open-lab.com                                                                                                                        _
 _ blog: http://pupunzi.open-lab.com                                                                                                                _
 _ Q&A:  http://jquery.pupunzi.com                                                                                                                  _
 _                                                                                                                                                  _
 _ Licences: MIT, GPL                                                                                                                               _
 _    http://www.opensource.org/licenses/mit-license.php                                                                                            _
 _    http://www.gnu.org/licenses/gpl.html                                                                                                          _
 _                                                                                                                                                  _
 _ Copyright (c) 2001-2015. Matteo Bicocchi (Pupunzi);                                                                                              _
 ___________________________________________________________________________________________________________________________________________________*/

var nAgt=navigator.userAgent;if(!jQuery.browser){jQuery.browser={},jQuery.browser.mozilla=!1,jQuery.browser.webkit=!1,jQuery.browser.opera=!1,jQuery.browser.safari=!1,jQuery.browser.chrome=!1,jQuery.browser.androidStock=!1,jQuery.browser.msie=!1,jQuery.browser.ua=nAgt,jQuery.browser.name=navigator.appName,jQuery.browser.fullVersion=""+parseFloat(navigator.appVersion),jQuery.browser.majorVersion=parseInt(navigator.appVersion,10);var nameOffset,verOffset,ix;if(-1!=(verOffset=nAgt.indexOf("Opera")))jQuery.browser.opera=!0,jQuery.browser.name="Opera",jQuery.browser.fullVersion=nAgt.substring(verOffset+6),-1!=(verOffset=nAgt.indexOf("Version"))&&(jQuery.browser.fullVersion=nAgt.substring(verOffset+8));else if(-1!=(verOffset=nAgt.indexOf("OPR")))jQuery.browser.opera=!0,jQuery.browser.name="Opera",jQuery.browser.fullVersion=nAgt.substring(verOffset+4);else if(-1!=(verOffset=nAgt.indexOf("MSIE")))jQuery.browser.msie=!0,jQuery.browser.name="Microsoft Internet Explorer",jQuery.browser.fullVersion=nAgt.substring(verOffset+5);else if(-1!=nAgt.indexOf("Trident")||-1!=nAgt.indexOf("Edge")){jQuery.browser.msie=!0,jQuery.browser.name="Microsoft Internet Explorer";var start=nAgt.indexOf("rv:")+3,end=start+4;jQuery.browser.fullVersion=nAgt.substring(start,end)}else-1!=(verOffset=nAgt.indexOf("Chrome"))?(jQuery.browser.webkit=!0,jQuery.browser.chrome=!0,jQuery.browser.name="Chrome",jQuery.browser.fullVersion=nAgt.substring(verOffset+7)):nAgt.indexOf("mozilla/5.0")>-1&&nAgt.indexOf("android ")>-1&&nAgt.indexOf("applewebkit")>-1&&!(nAgt.indexOf("chrome")>-1)?(verOffset=nAgt.indexOf("Chrome"),jQuery.browser.webkit=!0,jQuery.browser.androidStock=!0,jQuery.browser.name="androidStock",jQuery.browser.fullVersion=nAgt.substring(verOffset+7)):-1!=(verOffset=nAgt.indexOf("Safari"))?(jQuery.browser.webkit=!0,jQuery.browser.safari=!0,jQuery.browser.name="Safari",jQuery.browser.fullVersion=nAgt.substring(verOffset+7),-1!=(verOffset=nAgt.indexOf("Version"))&&(jQuery.browser.fullVersion=nAgt.substring(verOffset+8))):-1!=(verOffset=nAgt.indexOf("AppleWebkit"))?(jQuery.browser.webkit=!0,jQuery.browser.safari=!0,jQuery.browser.name="Safari",jQuery.browser.fullVersion=nAgt.substring(verOffset+7),-1!=(verOffset=nAgt.indexOf("Version"))&&(jQuery.browser.fullVersion=nAgt.substring(verOffset+8))):-1!=(verOffset=nAgt.indexOf("Firefox"))?(jQuery.browser.mozilla=!0,jQuery.browser.name="Firefox",jQuery.browser.fullVersion=nAgt.substring(verOffset+8)):(nameOffset=nAgt.lastIndexOf(" ")+1)<(verOffset=nAgt.lastIndexOf("/"))&&(jQuery.browser.name=nAgt.substring(nameOffset,verOffset),jQuery.browser.fullVersion=nAgt.substring(verOffset+1),jQuery.browser.name.toLowerCase()==jQuery.browser.name.toUpperCase()&&(jQuery.browser.name=navigator.appName));-1!=(ix=jQuery.browser.fullVersion.indexOf(";"))&&(jQuery.browser.fullVersion=jQuery.browser.fullVersion.substring(0,ix)),-1!=(ix=jQuery.browser.fullVersion.indexOf(" "))&&(jQuery.browser.fullVersion=jQuery.browser.fullVersion.substring(0,ix)),jQuery.browser.majorVersion=parseInt(""+jQuery.browser.fullVersion,10),isNaN(jQuery.browser.majorVersion)&&(jQuery.browser.fullVersion=""+parseFloat(navigator.appVersion),jQuery.browser.majorVersion=parseInt(navigator.appVersion,10)),jQuery.browser.version=jQuery.browser.majorVersion}jQuery.browser.android=/Android/i.test(nAgt),jQuery.browser.blackberry=/BlackBerry|BB|PlayBook/i.test(nAgt),jQuery.browser.ios=/iPhone|iPad|iPod|webOS/i.test(nAgt),jQuery.browser.operaMobile=/Opera Mini/i.test(nAgt),jQuery.browser.windowsMobile=/IEMobile|Windows Phone/i.test(nAgt),jQuery.browser.kindle=/Kindle|Silk/i.test(nAgt),jQuery.browser.mobile=jQuery.browser.android||jQuery.browser.blackberry||jQuery.browser.ios||jQuery.browser.windowsMobile||jQuery.browser.operaMobile||jQuery.browser.kindle,jQuery.isMobile=jQuery.browser.mobile,jQuery.isTablet=jQuery.browser.mobile&&jQuery(window).width()>765,jQuery.isAndroidDefault=jQuery.browser.android&&!/chrome/i.test(nAgt);

(function(b){b.simpleSlider={defaults:{initialval:0,scale:100,orientation:"h",readonly:!1,callback:!1},events:{start:b.browser.mobile?"touchstart":"mousedown",end:b.browser.mobile?"touchend":"mouseup",move:b.browser.mobile?"touchmove":"mousemove"},init:function(c){return this.each(function(){var a=this,d=b(a);d.addClass("simpleSlider");a.opt={};b.extend(a.opt,b.simpleSlider.defaults,c);b.extend(a.opt,d.data());var e="h"==a.opt.orientation?"horizontal":"vertical",e=b("<div/>").addClass("level").addClass(e);
  d.prepend(e);a.level=e;d.css({cursor:"default"});"auto"==a.opt.scale&&(a.opt.scale=b(a).outerWidth());d.updateSliderVal();a.opt.readonly||(d.on(b.simpleSlider.events.start,function(c){b.browser.mobile&&(c=c.changedTouches[0]);a.canSlide=!0;d.updateSliderVal(c);"h"==a.opt.orientation?d.css({cursor:"col-resize"}):d.css({cursor:"row-resize"});c.preventDefault();c.stopPropagation()}),b(document).on(b.simpleSlider.events.move,function(c){b.browser.mobile&&(c=c.changedTouches[0]);a.canSlide&&(b(document).css({cursor:"default"}),
      d.updateSliderVal(c),c.preventDefault(),c.stopPropagation())}).on(b.simpleSlider.events.end,function(){b(document).css({cursor:"auto"});a.canSlide=!1;d.css({cursor:"auto"})}))})},updateSliderVal:function(c){var a=this.get(0);if(a.opt){a.opt.initialval="number"==typeof a.opt.initialval?a.opt.initialval:a.opt.initialval(a);var d=b(a).outerWidth(),e=b(a).outerHeight();a.x="object"==typeof c?c.clientX+document.body.scrollLeft-this.offset().left:"number"==typeof c?c*d/a.opt.scale:a.opt.initialval*d/a.opt.scale;
  a.y="object"==typeof c?c.clientY+document.body.scrollTop-this.offset().top:"number"==typeof c?(a.opt.scale-a.opt.initialval-c)*e/a.opt.scale:a.opt.initialval*e/a.opt.scale;a.y=this.outerHeight()-a.y;a.scaleX=a.x*a.opt.scale/d;a.scaleY=a.y*a.opt.scale/e;a.outOfRangeX=a.scaleX>a.opt.scale?a.scaleX-a.opt.scale:0>a.scaleX?a.scaleX:0;a.outOfRangeY=a.scaleY>a.opt.scale?a.scaleY-a.opt.scale:0>a.scaleY?a.scaleY:0;a.outOfRange="h"==a.opt.orientation?a.outOfRangeX:a.outOfRangeY;a.value="undefined"!=typeof c?
          "h"==a.opt.orientation?a.x>=this.outerWidth()?a.opt.scale:0>=a.x?0:a.scaleX:a.y>=this.outerHeight()?a.opt.scale:0>=a.y?0:a.scaleY:"h"==a.opt.orientation?a.scaleX:a.scaleY;"h"==a.opt.orientation?a.level.width(Math.floor(100*a.x/d)+"%"):a.level.height(Math.floor(100*a.y/e));"function"==typeof a.opt.callback&&a.opt.callback(a)}}};b.fn.simpleSlider=b.simpleSlider.init;b.fn.updateSliderVal=b.simpleSlider.updateSliderVal})(jQuery);
;/*___________________________________________________________________________________________________________________________________________________
 _ jquery.mb.components                                                                                                                             _
 _                                                                                                                                                  _
 _ file: jquery.mb.storage.min.js                                                                                                                   _
 _ last modified: 24/05/15 16.08                                                                                                                    _
 _                                                                                                                                                  _
 _ Open Lab s.r.l., Florence - Italy                                                                                                                _
 _                                                                                                                                                  _
 _ email: matteo@open-lab.com                                                                                                                       _
 _ site: http://pupunzi.com                                                                                                                         _
 _       http://open-lab.com                                                                                                                        _
 _ blog: http://pupunzi.open-lab.com                                                                                                                _
 _ Q&A:  http://jquery.pupunzi.com                                                                                                                  _
 _                                                                                                                                                  _
 _ Licences: MIT, GPL                                                                                                                               _
 _    http://www.opensource.org/licenses/mit-license.php                                                                                            _
 _    http://www.gnu.org/licenses/gpl.html                                                                                                          _
 _                                                                                                                                                  _
 _ Copyright (c) 2001-2015. Matteo Bicocchi (Pupunzi);                                                                                              _
 ___________________________________________________________________________________________________________________________________________________*/

!function(a){a.mbCookie={set:function(a,b,c,d){b=JSON.stringify(b),c||(c=7),d=d?"; domain="+d:"";var f,e=new Date;e.setTime(e.getTime()+1e3*60*60*24*c),f="; expires="+e.toGMTString(),document.cookie=a+"="+b+f+"; path=/"+d},get:function(a){for(var b=a+"=",c=document.cookie.split(";"),d=0;d<c.length;d++){for(var e=c[d];" "==e.charAt(0);)e=e.substring(1,e.length);if(0==e.indexOf(b))return JSON.parse(e.substring(b.length,e.length))}return null},remove:function(b){a.mbCookie.set(b,"",-1)}},a.mbStorage={set:function(a,b){b=JSON.stringify(b),localStorage.setItem(a,b)},get:function(a){return localStorage[a]?JSON.parse(localStorage[a]):null},remove:function(a){a?localStorage.removeItem(a):localStorage.clear()}}}(jQuery);


(function() {
  var MutationObserver, Util, WeakMap, getComputedStyle, getComputedStyleRX,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Util = (function() {
    function Util() {}

    Util.prototype.extend = function(custom, defaults) {
      var key, value;
      for (key in defaults) {
        value = defaults[key];
        if (custom[key] == null) {
          custom[key] = value;
        }
      }
      return custom;
    };

    Util.prototype.isMobile = function(agent) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent);
    };

    Util.prototype.createEvent = function(event, bubble, cancel, detail) {
      var customEvent;
      if (bubble == null) {
        bubble = false;
      }
      if (cancel == null) {
        cancel = false;
      }
      if (detail == null) {
        detail = null;
      }
      if (document.createEvent != null) {
        customEvent = document.createEvent('CustomEvent');
        customEvent.initCustomEvent(event, bubble, cancel, detail);
      } else if (document.createEventObject != null) {
        customEvent = document.createEventObject();
        customEvent.eventType = event;
      } else {
        customEvent.eventName = event;
      }
      return customEvent;
    };

    Util.prototype.emitEvent = function(elem, event) {
      if (elem.dispatchEvent != null) {
        return elem.dispatchEvent(event);
      } else if (event in (elem != null)) {
        return elem[event]();
      } else if (("on" + event) in (elem != null)) {
        return elem["on" + event]();
      }
    };

    Util.prototype.addEvent = function(elem, event, fn) {
      if (elem.addEventListener != null) {
        return elem.addEventListener(event, fn, false);
      } else if (elem.attachEvent != null) {
        return elem.attachEvent("on" + event, fn);
      } else {
        return elem[event] = fn;
      }
    };

    Util.prototype.removeEvent = function(elem, event, fn) {
      if (elem.removeEventListener != null) {
        return elem.removeEventListener(event, fn, false);
      } else if (elem.detachEvent != null) {
        return elem.detachEvent("on" + event, fn);
      } else {
        return delete elem[event];
      }
    };

    Util.prototype.innerHeight = function() {
      if ('innerHeight' in window) {
        return window.innerHeight;
      } else {
        return document.documentElement.clientHeight;
      }
    };

    return Util;

  })();

  WeakMap = this.WeakMap || this.MozWeakMap || (WeakMap = (function() {
    function WeakMap() {
      this.keys = [];
      this.values = [];
    }

    WeakMap.prototype.get = function(key) {
      var i, item, j, len, ref;
      ref = this.keys;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        item = ref[i];
        if (item === key) {
          return this.values[i];
        }
      }
    };

    WeakMap.prototype.set = function(key, value) {
      var i, item, j, len, ref;
      ref = this.keys;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        item = ref[i];
        if (item === key) {
          this.values[i] = value;
          return;
        }
      }
      this.keys.push(key);
      return this.values.push(value);
    };

    return WeakMap;

  })());

  MutationObserver = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || (MutationObserver = (function() {
    function MutationObserver() {
      if (typeof console !== "undefined" && console !== null) {
        console.warn('MutationObserver is not supported by your browser.');
      }
      if (typeof console !== "undefined" && console !== null) {
        console.warn('WOW.js cannot detect dom mutations, please call .sync() after loading new content.');
      }
    }

    MutationObserver.notSupported = true;

    MutationObserver.prototype.observe = function() {};

    return MutationObserver;

  })());

  getComputedStyle = this.getComputedStyle || function(el, pseudo) {
    this.getPropertyValue = function(prop) {
      var ref;
      if (prop === 'float') {
        prop = 'styleFloat';
      }
      if (getComputedStyleRX.test(prop)) {
        prop.replace(getComputedStyleRX, function(_, _char) {
          return _char.toUpperCase();
        });
      }
      return ((ref = el.currentStyle) != null ? ref[prop] : void 0) || null;
    };
    return this;
  };

  getComputedStyleRX = /(\-([a-z]){1})/g;

  this.WOW = (function() {
    WOW.prototype.defaults = {
      boxClass: 'wow',
      animateClass: 'animated',
      offset: 0,
      mobile: true,
      live: true,
      callback: null
    };

    function WOW(options) {
      if (options == null) {
        options = {};
      }
      this.scrollCallback = bind(this.scrollCallback, this);
      this.scrollHandler = bind(this.scrollHandler, this);
      this.resetAnimation = bind(this.resetAnimation, this);
      this.start = bind(this.start, this);
      this.scrolled = true;
      this.config = this.util().extend(options, this.defaults);
      this.animationNameCache = new WeakMap();
      this.wowEvent = this.util().createEvent(this.config.boxClass);
    }

    WOW.prototype.init = function() {
      var ref;
      this.element = window.document.documentElement;
      if ((ref = document.readyState) === "interactive" || ref === "complete") {
        this.start();
      } else {
        this.util().addEvent(document, 'DOMContentLoaded', this.start);
      }
      return this.finished = [];
    };

    WOW.prototype.start = function() {
      var box, j, len, ref;
      this.stopped = false;
      this.boxes = (function() {
        var j, len, ref, results;
        ref = this.element.querySelectorAll("." + this.config.boxClass);
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          box = ref[j];
          results.push(box);
        }
        return results;
      }).call(this);
      this.all = (function() {
        var j, len, ref, results;
        ref = this.boxes;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          box = ref[j];
          results.push(box);
        }
        return results;
      }).call(this);
      if (this.boxes.length) {
        if (this.disabled()) {
          this.resetStyle();
        } else {
          ref = this.boxes;
          for (j = 0, len = ref.length; j < len; j++) {
            box = ref[j];
            this.applyStyle(box, true);
          }
        }
      }
      if (!this.disabled()) {
        this.util().addEvent(window, 'scroll', this.scrollHandler);
        this.util().addEvent(window, 'resize', this.scrollHandler);
        this.interval = setInterval(this.scrollCallback, 50);
      }
      if (this.config.live) {
        return new MutationObserver((function(_this) {
          return function(records) {
            var k, len1, node, record, results;
            results = [];
            for (k = 0, len1 = records.length; k < len1; k++) {
              record = records[k];
              results.push((function() {
                var l, len2, ref1, results1;
                ref1 = record.addedNodes || [];
                results1 = [];
                for (l = 0, len2 = ref1.length; l < len2; l++) {
                  node = ref1[l];
                  results1.push(this.doSync(node));
                }
                return results1;
              }).call(_this));
            }
            return results;
          };
        })(this)).observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    };

    WOW.prototype.stop = function() {
      this.stopped = true;
      this.util().removeEvent(window, 'scroll', this.scrollHandler);
      this.util().removeEvent(window, 'resize', this.scrollHandler);
      if (this.interval != null) {
        return clearInterval(this.interval);
      }
    };

    WOW.prototype.sync = function(element) {
      if (MutationObserver.notSupported) {
        return this.doSync(this.element);
      }
    };

    WOW.prototype.doSync = function(element) {
      var box, j, len, ref, results;
      if (element == null) {
        element = this.element;
      }
      if (element.nodeType !== 1) {
        return;
      }
      element = element.parentNode || element;
      ref = element.querySelectorAll("." + this.config.boxClass);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        box = ref[j];
        if (indexOf.call(this.all, box) < 0) {
          this.boxes.push(box);
          this.all.push(box);
          if (this.stopped || this.disabled()) {
            this.resetStyle();
          } else {
            this.applyStyle(box, true);
          }
          results.push(this.scrolled = true);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    WOW.prototype.show = function(box) {
      this.applyStyle(box);
      box.className = box.className + " " + this.config.animateClass;
      if (this.config.callback != null) {
        this.config.callback(box);
      }
      this.util().emitEvent(box, this.wowEvent);
      this.util().addEvent(box, 'animationend', this.resetAnimation);
      this.util().addEvent(box, 'oanimationend', this.resetAnimation);
      this.util().addEvent(box, 'webkitAnimationEnd', this.resetAnimation);
      this.util().addEvent(box, 'MSAnimationEnd', this.resetAnimation);
      return box;
    };

    WOW.prototype.applyStyle = function(box, hidden) {
      var delay, duration, iteration;
      duration = box.getAttribute('data-wow-duration');
      delay = box.getAttribute('data-wow-delay');
      iteration = box.getAttribute('data-wow-iteration');
      return this.animate((function(_this) {
        return function() {
          return _this.customStyle(box, hidden, duration, delay, iteration);
        };
      })(this));
    };

    WOW.prototype.animate = (function() {
      if ('requestAnimationFrame' in window) {
        return function(callback) {
          return window.requestAnimationFrame(callback);
        };
      } else {
        return function(callback) {
          return callback();
        };
      }
    })();

    WOW.prototype.resetStyle = function() {
      var box, j, len, ref, results;
      ref = this.boxes;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        box = ref[j];
        results.push(box.style.visibility = 'visible');
      }
      return results;
    };

    WOW.prototype.resetAnimation = function(event) {
      var target;
      if (event.type.toLowerCase().indexOf('animationend') >= 0) {
        target = event.target || event.srcElement;
        return target.className = target.className.replace(this.config.animateClass, '').trim();
      }
    };

    WOW.prototype.customStyle = function(box, hidden, duration, delay, iteration) {
      if (hidden) {
        this.cacheAnimationName(box);
      }
      box.style.visibility = hidden ? 'hidden' : 'visible';
      if (duration) {
        this.vendorSet(box.style, {
          animationDuration: duration
        });
      }
      if (delay) {
        this.vendorSet(box.style, {
          animationDelay: delay
        });
      }
      if (iteration) {
        this.vendorSet(box.style, {
          animationIterationCount: iteration
        });
      }
      this.vendorSet(box.style, {
        animationName: hidden ? 'none' : this.cachedAnimationName(box)
      });
      return box;
    };

    WOW.prototype.vendors = ["moz", "webkit"];

    WOW.prototype.vendorSet = function(elem, properties) {
      var name, results, value, vendor;
      results = [];
      for (name in properties) {
        value = properties[name];
        elem["" + name] = value;
        results.push((function() {
          var j, len, ref, results1;
          ref = this.vendors;
          results1 = [];
          for (j = 0, len = ref.length; j < len; j++) {
            vendor = ref[j];
            results1.push(elem["" + vendor + (name.charAt(0).toUpperCase()) + (name.substr(1))] = value);
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    WOW.prototype.vendorCSS = function(elem, property) {
      var j, len, ref, result, style, vendor;
      style = getComputedStyle(elem);
      result = style.getPropertyCSSValue(property);
      ref = this.vendors;
      for (j = 0, len = ref.length; j < len; j++) {
        vendor = ref[j];
        result = result || style.getPropertyCSSValue("-" + vendor + "-" + property);
      }
      return result;
    };

    WOW.prototype.animationName = function(box) {
      var animationName;
      try {
        animationName = this.vendorCSS(box, 'animation-name').cssText;
      } catch (_error) {
        animationName = getComputedStyle(box).getPropertyValue('animation-name');
      }
      if (animationName === 'none') {
        return '';
      } else {
        return animationName;
      }
    };

    WOW.prototype.cacheAnimationName = function(box) {
      return this.animationNameCache.set(box, this.animationName(box));
    };

    WOW.prototype.cachedAnimationName = function(box) {
      return this.animationNameCache.get(box);
    };

    WOW.prototype.scrollHandler = function() {
      return this.scrolled = true;
    };

    WOW.prototype.scrollCallback = function() {
      var box;
      if (this.scrolled) {
        this.scrolled = false;
        this.boxes = (function() {
          var j, len, ref, results;
          ref = this.boxes;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            box = ref[j];
            if (!(box)) {
              continue;
            }
            if (this.isVisible(box)) {
              this.show(box);
              continue;
            }
            results.push(box);
          }
          return results;
        }).call(this);
        if (!(this.boxes.length || this.config.live)) {
          return this.stop();
        }
      }
    };

    WOW.prototype.offsetTop = function(element) {
      var top;
      while (element.offsetTop === void 0) {
        element = element.parentNode;
      }
      top = element.offsetTop;
      while (element = element.offsetParent) {
        top += element.offsetTop;
      }
      return top;
    };

    WOW.prototype.isVisible = function(box) {
      var bottom, offset, top, viewBottom, viewTop;
      offset = box.getAttribute('data-wow-offset') || this.config.offset;
      viewTop = window.pageYOffset;
      viewBottom = viewTop + Math.min(this.element.clientHeight, this.util().innerHeight()) - offset;
      top = this.offsetTop(box);
      bottom = top + box.clientHeight;
      return top <= viewBottom && bottom >= viewTop;
    };

    WOW.prototype.util = function() {
      return this._util != null ? this._util : this._util = new Util();
    };

    WOW.prototype.disabled = function() {
      return !this.config.mobile && this.util().isMobile(navigator.userAgent);
    };

    return WOW;

  })();

}).call(this);





