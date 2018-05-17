/*!
 *  * machina - A library for creating powerful and flexible finite state machines. Loosely inspired by Erlang/OTP's gen_fsm behavior.
 *  * Author: Jim Cowart (http://ifandelse.com)
 *  * Version: v2.0.2
 *  * Url: http://machina-js.org/
 *  * License(s): 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("lodash"));
	else if(typeof define === 'function' && define.amd)
		define(["lodash"], factory);
	else if(typeof exports === 'object')
		exports["machina"] = factory(require("lodash"));
	else
		root["machina"] = factory(root["_"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	var emitter = __webpack_require__( 2 );
	
	module.exports = _.merge( emitter.instance, {
		Fsm: __webpack_require__( 5 ),
		BehavioralFsm: __webpack_require__( 6 ),
		utils: __webpack_require__( 3 ),
		eventListeners: {
			newFsm: []
		}
	} );


/***/ }),
/* 1 */
/***/ (function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	var utils = __webpack_require__( 3 );
	var _ = __webpack_require__( 1 );
	
	function getInstance() {
		return {
			emit: function( eventName ) {
				var args = utils.getLeaklessArgs( arguments );
				if ( this.eventListeners[ "*" ] ) {
					_.each( this.eventListeners[ "*" ], function( callback ) {
						if ( !this.useSafeEmit ) {
							callback.apply( this, args );
						} else {
							try {
								callback.apply( this, args );
							} catch ( exception ) {
								/* istanbul ignore else  */
								if ( console && typeof console.log !== "undefined" ) {
									console.log( exception.stack );
								}
							}
						}
					}, this );
				}
				if ( this.eventListeners[ eventName ] ) {
					_.each( this.eventListeners[ eventName ], function( callback ) {
						if ( !this.useSafeEmit ) {
							callback.apply( this, args.slice( 1 ) );
						} else {
							try {
								callback.apply( this, args.slice( 1 ) );
							} catch ( exception ) {
								/* istanbul ignore else  */
								if ( console && typeof console.log !== "undefined" ) {
									console.log( exception.stack );
								}
							}
						}
					}, this );
				}
			},
	
			on: function( eventName, callback ) {
				var self = this;
				self.eventListeners = self.eventListeners || { "*": [] };
				if ( !self.eventListeners[ eventName ] ) {
					self.eventListeners[ eventName ] = [];
				}
				self.eventListeners[ eventName ].push( callback );
				return {
					eventName: eventName,
					callback: callback,
					off: function() {
						self.off( eventName, callback );
					}
				};
			},
	
			off: function( eventName, callback ) {
				this.eventListeners = this.eventListeners || { "*": [] };
				if ( !eventName ) {
					this.eventListeners = {};
				} else {
					if ( callback ) {
						this.eventListeners[ eventName ] = _.without( this.eventListeners[ eventName ], callback );
					} else {
						this.eventListeners[ eventName ] = [];
					}
				}
			}
		};
	}
	
	module.exports = {
		getInstance: getInstance,
		instance: getInstance()
	};


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	var slice = [].slice;
	var events = __webpack_require__( 4 );
	var _ = __webpack_require__( 1 );
	
	var makeFsmNamespace = ( function() {
		var machinaCount = 0;
		return function() {
			return "fsm." + machinaCount++;
		};
	} )();
	
	function getDefaultBehavioralOptions() {
		return {
			initialState: "uninitialized",
			eventListeners: {
				"*": []
			},
			states: {},
			namespace: makeFsmNamespace(),
			useSafeEmit: false,
			hierarchy: {},
			pendingDelegations: {}
		};
	}
	
	function getDefaultClientMeta() {
		return {
			inputQueue: [],
			targetReplayState: "",
			state: undefined,
			priorState: undefined,
			priorAction: "",
			currentAction: "",
			currentActionArgs: undefined,
			inExitHandler: false
		};
	}
	
	function getLeaklessArgs( args, startIdx ) {
		var result = [];
		for ( var i = ( startIdx || 0 ); i < args.length; i++ ) {
			result[ i ] = args[ i ];
		}
		return result;
	}
	/*
		handle ->
			child = stateObj._child && stateObj._child.instance;
	
		transition ->
			newStateObj._child = getChildFsmInstance( newStateObj._child );
			child = newStateObj._child && newStateObj._child.instance;
	*/
	function getChildFsmInstance( config ) {
		if ( !config ) {
			return;
		}
		var childFsmDefinition = {};
		if ( typeof config === "object" ) {
			// is this a config object with a factory?
			if ( config.factory ) {
				childFsmDefinition = config;
				childFsmDefinition.instance = childFsmDefinition.factory();
			} else {
				// assuming this is a machina instance
				childFsmDefinition.factory = function() {
					return config;
				};
			}
		} else if ( typeof config === "function" ) {
			childFsmDefinition.factory = config;
		}
		childFsmDefinition.instance = childFsmDefinition.factory();
		return childFsmDefinition;
	}
	
	function listenToChild( fsm, child ) {
		// Need to investigate potential for discarded event
		// listener memory leak in long-running, deeply-nested hierarchies.
		return child.on( "*", function( eventName, data ) {
			switch ( eventName ) {
				case events.NO_HANDLER:
					if ( !data.ticket && !data.delegated && data.namespace !== fsm.namespace ) {
						// Ok - we're dealing w/ a child handling input that should bubble up
						data.args[ 1 ].bubbling = true;
					}
					// we do NOT bubble _reset inputs up to the parent
					if ( data.inputType !== "_reset" ) {
						fsm.handle.apply( fsm, data.args );
					}
					break;
				case events.HANDLING :
					var ticket = data.ticket;
					if ( ticket && fsm.pendingDelegations[ ticket ] ) {
						delete fsm.pendingDelegations[ ticket ];
					}
					fsm.emit( eventName, data ); // possibly transform payload?
					break;
				default:
					fsm.emit( eventName, data ); // possibly transform payload?
					break;
			}
		} );
	}
	
	// _machKeys are members we want to track across the prototype chain of an extended FSM constructor
	// Since we want to eventually merge the aggregate of those values onto the instance so that FSMs
	// that share the same extended prototype won't share state *on* those prototypes.
	var _machKeys = [ "states", "initialState" ];
	var extend = function( protoProps, staticProps ) {
		var parent = this;
		var fsm; // placeholder for instance constructor
		var machObj = {}; // object used to hold initialState & states from prototype for instance-level merging
		var Ctor = function() {}; // placeholder ctor function used to insert level in prototype chain
	
		// The constructor function for the new subclass is either defined by you
		// (the "constructor" property in your `extend` definition), or defaulted
		// by us to simply call the parent's constructor.
		if ( protoProps && protoProps.hasOwnProperty( "constructor" ) ) {
			fsm = protoProps.constructor;
		} else {
			// The default machina constructor (when using inheritance) creates a
			// deep copy of the states/initialState values from the prototype and
			// extends them over the instance so that they'll be instance-level.
			// If an options arg (args[0]) is passed in, a states or intialState
			// value will be preferred over any data pulled up from the prototype.
			fsm = function() {
				var args = slice.call( arguments, 0 );
				args[ 0 ] = args[ 0 ] || {};
				var blendedState;
				var instanceStates = args[ 0 ].states || {};
				blendedState = _.merge( _.cloneDeep( machObj ), { states: instanceStates } );
				blendedState.initialState = args[ 0 ].initialState || this.initialState;
				_.extend( args[ 0 ], blendedState );
				parent.apply( this, args );
			};
		}
	
		// Inherit class (static) properties from parent.
		_.merge( fsm, parent );
	
		// Set the prototype chain to inherit from `parent`, without calling
		// `parent`'s constructor function.
		Ctor.prototype = parent.prototype;
		fsm.prototype = new Ctor();
	
		// Add prototype properties (instance properties) to the subclass,
		// if supplied.
		if ( protoProps ) {
			_.extend( fsm.prototype, protoProps );
			_.merge( machObj, _.transform( protoProps, function( accum, val, key ) {
				if ( _machKeys.indexOf( key ) !== -1 ) {
					accum[ key ] = val;
				}
			} ) );
		}
	
		// Add static properties to the constructor function, if supplied.
		if ( staticProps ) {
			_.merge( fsm, staticProps );
		}
	
		// Correctly set child's `prototype.constructor`.
		fsm.prototype.constructor = fsm;
	
		// Set a convenience property in case the parent's prototype is needed later.
		fsm.__super__ = parent.prototype;
		return fsm;
	};
	
	function createUUID() {
		var s = [];
		var hexDigits = "0123456789abcdef";
		for ( var i = 0; i < 36; i++ ) {
			s[ i ] = hexDigits.substr( Math.floor( Math.random() * 0x10 ), 1 );
		}
		s[ 14 ] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
		/* jshint ignore:start */
		s[ 19 ] = hexDigits.substr( ( s[ 19 ] & 0x3 ) | 0x8, 1 ); // bits 6-7 of the clock_seq_hi_and_reserved to 01
		/* jshint ignore:end */
		s[ 8 ] = s[ 13 ] = s[ 18 ] = s[ 23 ] = "-";
		return s.join( "" );
	}
	
	module.exports = {
		createUUID: createUUID,
		extend: extend,
		getDefaultBehavioralOptions: getDefaultBehavioralOptions,
		getDefaultOptions: getDefaultBehavioralOptions,
		getDefaultClientMeta: getDefaultClientMeta,
		getChildFsmInstance: getChildFsmInstance,
		getLeaklessArgs: getLeaklessArgs,
		listenToChild: listenToChild,
		makeFsmNamespace: makeFsmNamespace
	};


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	module.exports = {
		NEXT_TRANSITION: "transition",
		HANDLING: "handling",
		HANDLED: "handled",
		NO_HANDLER: "nohandler",
		TRANSITION: "transition",
		TRANSITIONED: "transitioned",
		INVALID_STATE: "invalidstate",
		DEFERRED: "deferred",
		NEW_FSM: "newfsm"
	};


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	var BehavioralFsm = __webpack_require__( 6 );
	var utils = __webpack_require__( 3 );
	var _ = __webpack_require__( 1 );
	
	var Fsm = {
		constructor: function() {
			BehavioralFsm.apply( this, arguments );
			this.ensureClientMeta();
		},
		initClient: function initClient() {
			var initialState = this.initialState;
			if ( !initialState ) {
				throw new Error( "You must specify an initial state for this FSM" );
			}
			if ( !this.states[ initialState ] ) {
				throw new Error( "The initial state specified does not exist in the states object." );
			}
			this.transition( initialState );
		},
		ensureClientMeta: function ensureClientMeta() {
			if ( !this._stamped ) {
				this._stamped = true;
				_.defaults( this, _.cloneDeep( utils.getDefaultClientMeta() ) );
				this.initClient();
			}
			return this;
		},
	
		ensureClientArg: function( args ) {
			var _args = args;
			// we need to test the args and verify that if a client arg has
			// been passed, it must be this FSM instance (this isn't a behavioral FSM)
			if ( typeof _args[ 0 ] === "object" && !( "inputType" in _args[ 0 ] ) && _args[ 0 ] !== this ) {
				_args.splice( 0, 1, this );
			} else if ( typeof _args[ 0 ] !== "object" || ( typeof _args[ 0 ] === "object" && ( "inputType" in _args[ 0 ] ) ) ) {
				_args.unshift( this );
			}
			return _args;
		},
	
		getHandlerArgs: function( args, isCatchAll ) {
			// index 0 is the client, index 1 is inputType
			// if we're in a catch-all handler, input type needs to be included in the args
			// inputType might be an object, so we need to just get the inputType string if so
			var _args = args;
			var input = _args[ 1 ];
			if ( typeof inputType === "object" ) {
				_args.splice( 1, 1, input.inputType );
			}
			return isCatchAll ?
				_args.slice( 1 ) :
				_args.slice( 2 );
		},
	
		getSystemHandlerArgs: function( args, client ) {
			return args;
		},
	
		// "classic" machina FSM do not emit the client property on events (which would be the FSM itself)
		buildEventPayload: function() {
			var args = this.ensureClientArg( utils.getLeaklessArgs( arguments ) );
			var data = args[ 1 ];
			if ( _.isPlainObject( data ) ) {
				return _.extend( data, { namespace: this.namespace } );
			} else {
				return { data: data || null, namespace: this.namespace };
			}
		}
	};
	
	_.each( [
		"handle",
		"transition",
		"deferUntilTransition",
		"processQueue",
		"clearQueue"
	], function( methodWithClientInjected ) {
		Fsm[ methodWithClientInjected ] = function() {
			var args = this.ensureClientArg( utils.getLeaklessArgs( arguments ) );
			return BehavioralFsm.prototype[ methodWithClientInjected ].apply( this, args );
		};
	} );
	
	Fsm = BehavioralFsm.extend( Fsm );
	
	module.exports = Fsm;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	var utils = __webpack_require__( 3 );
	var emitter = __webpack_require__( 2 );
	var topLevelEmitter = emitter.instance;
	var events = __webpack_require__( 4 );
	
	var MACHINA_PROP = "__machina__";
	
	function BehavioralFsm( options ) {
		_.extend( this, options );
		_.defaults( this, utils.getDefaultBehavioralOptions() );
		this.initialize.apply( this, arguments );
		topLevelEmitter.emit( events.NEW_FSM, this );
	}
	
	_.extend( BehavioralFsm.prototype, {
		initialize: function() {},
	
		initClient: function initClient( client ) {
			var initialState = this.initialState;
			if ( !initialState ) {
				throw new Error( "You must specify an initial state for this FSM" );
			}
			if ( !this.states[ initialState ] ) {
				throw new Error( "The initial state specified does not exist in the states object." );
			}
			this.transition( client, initialState );
		},
	
		configForState: function configForState( newState, instantiateClient ) {
			var newStateObj = this.states[ newState ];
			var child;
			_.each( this.hierarchy, function( childListener, key ) {
				if ( childListener && typeof childListener.off === "function" ) {
					childListener.off();
				}
			} );
	
			if ( newStateObj._child ) {
				if ( instantiateClient ) {
					newStateObj._child = utils.getChildFsmInstance( newStateObj._child );
				}
	
				child = newStateObj._child && newStateObj._child.instance;
				this.hierarchy[ child.namespace ] = utils.listenToChild( this, child );
			}
	
			return child;
		},
	
		ensureClientMeta: function ensureClientMeta( client ) {
			if ( typeof client !== "object" ) {
				throw new Error( "An FSM client must be an object." );
			}
			client[ MACHINA_PROP ] = client[ MACHINA_PROP ] || {};
			if ( !client[ MACHINA_PROP ][ this.namespace ] ) {
				client[ MACHINA_PROP ][ this.namespace ] = _.cloneDeep( utils.getDefaultClientMeta() );
				this.initClient( client );
			}
			return client[ MACHINA_PROP ][ this.namespace ];
		},
	
		buildEventPayload: function( client, data ) {
			if ( _.isPlainObject( data ) ) {
				return _.extend( data, { client: client, namespace: this.namespace } );
			} else {
				return { client: client, data: data || null, namespace: this.namespace };
			}
		},
	
		getHandlerArgs: function( args, isCatchAll ) {
			// index 0 is the client, index 1 is inputType
			// if we're in a catch-all handler, input type needs to be included in the args
			// inputType might be an object, so we need to just get the inputType string if so
			var _args = args.slice( 0 );
			var input = _args[ 1 ];
			if ( typeof input === "object" ) {
				_args.splice( 1, 1, input.inputType );
			}
			return isCatchAll ?
				_args :
				[ _args[ 0 ] ].concat( _args.slice( 2 ) );
		},
	
		getSystemHandlerArgs: function( args, client ) {
			return [ client ].concat( args );
		},
	
		handle: function( client, input ) {
			var inputDef = input;
			if ( typeof input === "undefined" ) {
				throw new Error( "The input argument passed to the FSM's handle method is undefined. Did you forget to pass the input name?" );
			}
			if ( typeof input === "string" ) {
				inputDef = { inputType: input, delegated: false, ticket: undefined };
			}
			var clientMeta = this.ensureClientMeta( client );
			var args = utils.getLeaklessArgs( arguments );
			if ( typeof input !== "object" ) {
				args.splice( 1, 1, inputDef );
			}
			clientMeta.currentActionArgs = args.slice( 1 );
			var currentState = clientMeta.state;
			var stateObj = this.states[ currentState ];
			var handlerName;
			var handler;
			var isCatchAll = false;
			var child;
			var result;
			var action;
			if ( !clientMeta.inExitHandler ) {
				child = this.configForState( currentState, false );
				if ( child && !this.pendingDelegations[ inputDef.ticket ] && !inputDef.bubbling ) {
					inputDef.ticket = ( inputDef.ticket || utils.createUUID() );
					inputDef.delegated = true;
					this.pendingDelegations[ inputDef.ticket ] = { delegatedTo: child.namespace };
					// WARNING - returning a value from `handle` on child FSMs is not really supported.
					// If you need to return values from child FSM input handlers, use events instead.
					result = child.handle.apply( child, args );
				} else {
					if ( inputDef.ticket && this.pendingDelegations[ inputDef.ticket ] ) {
						delete this.pendingDelegations[ inputDef.ticket ];
					}
					handlerName = stateObj[ inputDef.inputType ] ? inputDef.inputType : "*";
					isCatchAll = ( handlerName === "*" );
					handler = ( stateObj[ handlerName ] || this[ handlerName ] ) || this[ "*" ];
					action = clientMeta.state + "." + handlerName;
					clientMeta.currentAction = action;
					var eventPayload = this.buildEventPayload(
						client,
						{ inputType: inputDef.inputType, delegated: inputDef.delegated, ticket: inputDef.ticket }
					);
					if ( !handler ) {
						this.emit( events.NO_HANDLER, _.extend( { args: args }, eventPayload ) );
					} else {
						this.emit( events.HANDLING, eventPayload );
						if ( typeof handler === "function" ) {
							result = handler.apply( this, this.getHandlerArgs( args, isCatchAll ) );
						} else {
							result = handler;
							this.transition( client, handler );
						}
						this.emit( events.HANDLED, eventPayload );
					}
					clientMeta.priorAction = clientMeta.currentAction;
					clientMeta.currentAction = "";
					clientMeta.currentActionArgs = undefined;
				}
			}
			return result;
		},
	
		transition: function( client, newState ) {
			var clientMeta = this.ensureClientMeta( client );
			var curState = clientMeta.state;
			var curStateObj = this.states[ curState ];
			var newStateObj = this.states[ newState ];
			var child;
			var args = utils.getLeaklessArgs( arguments ).slice( 2 );
			if ( !clientMeta.inExitHandler && newState !== curState ) {
				if ( newStateObj ) {
					child = this.configForState( newState, true );
					if ( curStateObj && curStateObj._onExit ) {
						clientMeta.inExitHandler = true;
						curStateObj._onExit.call( this, client );
						clientMeta.inExitHandler = false;
					}
					clientMeta.targetReplayState = newState;
					clientMeta.priorState = curState;
					clientMeta.state = newState;
					var eventPayload = this.buildEventPayload( client, {
						fromState: clientMeta.priorState,
						action: clientMeta.currentAction,
						toState: newState
					} );
					this.emit( events.TRANSITION, eventPayload );
					if ( newStateObj._onEnter ) {
						newStateObj._onEnter.apply( this, this.getSystemHandlerArgs( args, client ) );
					}
					this.emit( events.TRANSITIONED, eventPayload );
					if ( child ) {
						child.handle( client, "_reset" );
					}
	
					if ( clientMeta.targetReplayState === newState ) {
						this.processQueue( client, events.NEXT_TRANSITION );
					}
					return;
				}
				this.emit( events.INVALID_STATE, this.buildEventPayload( client, {
					state: clientMeta.state,
					attemptedState: newState
				} ) );
			}
		},
	
		deferUntilTransition: function( client, stateName ) {
			var clientMeta = this.ensureClientMeta( client );
			if ( clientMeta.currentActionArgs ) {
				var queued = {
					type: events.NEXT_TRANSITION,
					untilState: stateName,
					args: clientMeta.currentActionArgs
				};
				clientMeta.inputQueue.push( queued );
				var eventPayload = this.buildEventPayload( client, {
					state: clientMeta.state,
					queuedArgs: queued
				} );
				this.emit( events.DEFERRED, eventPayload );
			}
		},
	
		deferAndTransition: function( client, stateName ) {
			this.deferUntilTransition( client, stateName );
			this.transition( client, stateName );
		},
	
		processQueue: function( client ) {
			var clientMeta = this.ensureClientMeta( client );
			var filterFn = function( item ) {
				return ( ( !item.untilState ) || ( item.untilState === clientMeta.state ) );
			};
			var toProcess = _.filter( clientMeta.inputQueue, filterFn );
			clientMeta.inputQueue = _.difference( clientMeta.inputQueue, toProcess );
			_.each( toProcess, function( item ) {
				this.handle.apply( this, [ client ].concat( item.args ) );
			}.bind( this ) );
		},
	
		clearQueue: function( client, name ) {
			var clientMeta = this.ensureClientMeta( client );
			if ( !name ) {
				clientMeta.inputQueue = [];
			} else {
				var filter = function( evnt ) {
					return ( name ? evnt.untilState !== name : true );
				};
				clientMeta.inputQueue = _.filter( clientMeta.inputQueue, filter );
			}
		},
	
		compositeState: function( client ) {
			var clientMeta = this.ensureClientMeta( client );
			var state = clientMeta.state;
			var child = this.states[state]._child && this.states[state]._child.instance;
			if ( child ) {
				state += "." + child.compositeState( client );
			}
			return state;
		}
	}, emitter.getInstance() );
	
	BehavioralFsm.extend = utils.extend;
	
	module.exports = BehavioralFsm;


/***/ })
/******/ ])
});
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovLy93ZWJwYWNrL2Jvb3RzdHJhcCA1OTI4NzFjOTRkZjNiMmUxYzYxYSIsIndlYnBhY2s6Ly8vLi9zcmMvbWFjaGluYS5qcyIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwge1wicm9vdFwiOlwiX1wiLFwiY29tbW9uanNcIjpcImxvZGFzaFwiLFwiY29tbW9uanMyXCI6XCJsb2Rhc2hcIixcImFtZFwiOlwibG9kYXNoXCJ9Iiwid2VicGFjazovLy8uL3NyYy9lbWl0dGVyLmpzIiwid2VicGFjazovLy8uL3NyYy91dGlscy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvZXZlbnRzLmpzIiwid2VicGFjazovLy8uL3NyYy9Gc20uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL0JlaGF2aW9yYWxGc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO0FDVkE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7OztBQ3RDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBQzs7Ozs7OztBQ1ZELGdEOzs7Ozs7QUNBQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLFFBQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFD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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7QUFDQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUc7QUFDSCxHQUFFOztBQUVGO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUM7O0FBRUQ7O0FBRUEiLCJmaWxlIjoibWFjaGluYS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcImxvZGFzaFwiKSk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXCJsb2Rhc2hcIl0sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wibWFjaGluYVwiXSA9IGZhY3RvcnkocmVxdWlyZShcImxvZGFzaFwiKSk7XG5cdGVsc2Vcblx0XHRyb290W1wibWFjaGluYVwiXSA9IGZhY3Rvcnkocm9vdFtcIl9cIl0pO1xufSkodGhpcywgZnVuY3Rpb24oX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8xX18pIHtcbnJldHVybiBcblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGV4cG9ydHM6IHt9LFxuIFx0XHRcdGlkOiBtb2R1bGVJZCxcbiBcdFx0XHRsb2FkZWQ6IGZhbHNlXG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmxvYWRlZCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgNTkyODcxYzk0ZGYzYjJlMWM2MWEiLCJ2YXIgXyA9IHJlcXVpcmUoIFwibG9kYXNoXCIgKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSggXCIuL2VtaXR0ZXJcIiApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF8ubWVyZ2UoIGVtaXR0ZXIuaW5zdGFuY2UsIHtcblx0RnNtOiByZXF1aXJlKCBcIi4vRnNtXCIgKSxcblx0QmVoYXZpb3JhbEZzbTogcmVxdWlyZSggXCIuL0JlaGF2aW9yYWxGc21cIiApLFxuXHR1dGlsczogcmVxdWlyZSggXCIuL3V0aWxzXCIgKSxcblx0ZXZlbnRMaXN0ZW5lcnM6IHtcblx0XHRuZXdGc206IFtdXG5cdH1cbn0gKTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL21hY2hpbmEuanNcbi8vIG1vZHVsZSBpZCA9IDBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwibW9kdWxlLmV4cG9ydHMgPSBfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFXzFfXztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyBleHRlcm5hbCB7XCJyb290XCI6XCJfXCIsXCJjb21tb25qc1wiOlwibG9kYXNoXCIsXCJjb21tb25qczJcIjpcImxvZGFzaFwiLFwiYW1kXCI6XCJsb2Rhc2hcIn1cbi8vIG1vZHVsZSBpZCA9IDFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIHV0aWxzID0gcmVxdWlyZSggXCIuL3V0aWxzXCIgKTtcbnZhciBfID0gcmVxdWlyZSggXCJsb2Rhc2hcIiApO1xuXG5mdW5jdGlvbiBnZXRJbnN0YW5jZSgpIHtcblx0cmV0dXJuIHtcblx0XHRlbWl0OiBmdW5jdGlvbiggZXZlbnROYW1lICkge1xuXHRcdFx0dmFyIGFyZ3MgPSB1dGlscy5nZXRMZWFrbGVzc0FyZ3MoIGFyZ3VtZW50cyApO1xuXHRcdFx0aWYgKCB0aGlzLmV2ZW50TGlzdGVuZXJzWyBcIipcIiBdICkge1xuXHRcdFx0XHRfLmVhY2goIHRoaXMuZXZlbnRMaXN0ZW5lcnNbIFwiKlwiIF0sIGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRcdFx0XHRpZiAoICF0aGlzLnVzZVNhZmVFbWl0ICkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2suYXBwbHkoIHRoaXMsIGFyZ3MgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2suYXBwbHkoIHRoaXMsIGFyZ3MgKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKCBleGNlcHRpb24gKSB7XG5cdFx0XHRcdFx0XHRcdC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuXHRcdFx0XHRcdFx0XHRpZiAoIGNvbnNvbGUgJiYgdHlwZW9mIGNvbnNvbGUubG9nICE9PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCBleGNlcHRpb24uc3RhY2sgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgdGhpcyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCB0aGlzLmV2ZW50TGlzdGVuZXJzWyBldmVudE5hbWUgXSApIHtcblx0XHRcdFx0Xy5lYWNoKCB0aGlzLmV2ZW50TGlzdGVuZXJzWyBldmVudE5hbWUgXSwgZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuXHRcdFx0XHRcdGlmICggIXRoaXMudXNlU2FmZUVtaXQgKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjay5hcHBseSggdGhpcywgYXJncy5zbGljZSggMSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrLmFwcGx5KCB0aGlzLCBhcmdzLnNsaWNlKCAxICkgKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKCBleGNlcHRpb24gKSB7XG5cdFx0XHRcdFx0XHRcdC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuXHRcdFx0XHRcdFx0XHRpZiAoIGNvbnNvbGUgJiYgdHlwZW9mIGNvbnNvbGUubG9nICE9PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCBleGNlcHRpb24uc3RhY2sgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgdGhpcyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRvbjogZnVuY3Rpb24oIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRzZWxmLmV2ZW50TGlzdGVuZXJzID0gc2VsZi5ldmVudExpc3RlbmVycyB8fCB7IFwiKlwiOiBbXSB9O1xuXHRcdFx0aWYgKCAhc2VsZi5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0gKSB7XG5cdFx0XHRcdHNlbGYuZXZlbnRMaXN0ZW5lcnNbIGV2ZW50TmFtZSBdID0gW107XG5cdFx0XHR9XG5cdFx0XHRzZWxmLmV2ZW50TGlzdGVuZXJzWyBldmVudE5hbWUgXS5wdXNoKCBjYWxsYmFjayApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXZlbnROYW1lOiBldmVudE5hbWUsXG5cdFx0XHRcdGNhbGxiYWNrOiBjYWxsYmFjayxcblx0XHRcdFx0b2ZmOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLm9mZiggZXZlbnROYW1lLCBjYWxsYmFjayApO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRvZmY6IGZ1bmN0aW9uKCBldmVudE5hbWUsIGNhbGxiYWNrICkge1xuXHRcdFx0dGhpcy5ldmVudExpc3RlbmVycyA9IHRoaXMuZXZlbnRMaXN0ZW5lcnMgfHwgeyBcIipcIjogW10gfTtcblx0XHRcdGlmICggIWV2ZW50TmFtZSApIHtcblx0XHRcdFx0dGhpcy5ldmVudExpc3RlbmVycyA9IHt9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjayApIHtcblx0XHRcdFx0XHR0aGlzLmV2ZW50TGlzdGVuZXJzWyBldmVudE5hbWUgXSA9IF8ud2l0aG91dCggdGhpcy5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0sIGNhbGxiYWNrICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0gPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGdldEluc3RhbmNlOiBnZXRJbnN0YW5jZSxcblx0aW5zdGFuY2U6IGdldEluc3RhbmNlKClcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9lbWl0dGVyLmpzXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBzbGljZSA9IFtdLnNsaWNlO1xudmFyIGV2ZW50cyA9IHJlcXVpcmUoIFwiLi9ldmVudHMuanNcIiApO1xudmFyIF8gPSByZXF1aXJlKCBcImxvZGFzaFwiICk7XG5cbnZhciBtYWtlRnNtTmFtZXNwYWNlID0gKCBmdW5jdGlvbigpIHtcblx0dmFyIG1hY2hpbmFDb3VudCA9IDA7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gXCJmc20uXCIgKyBtYWNoaW5hQ291bnQrKztcblx0fTtcbn0gKSgpO1xuXG5mdW5jdGlvbiBnZXREZWZhdWx0QmVoYXZpb3JhbE9wdGlvbnMoKSB7XG5cdHJldHVybiB7XG5cdFx0aW5pdGlhbFN0YXRlOiBcInVuaW5pdGlhbGl6ZWRcIixcblx0XHRldmVudExpc3RlbmVyczoge1xuXHRcdFx0XCIqXCI6IFtdXG5cdFx0fSxcblx0XHRzdGF0ZXM6IHt9LFxuXHRcdG5hbWVzcGFjZTogbWFrZUZzbU5hbWVzcGFjZSgpLFxuXHRcdHVzZVNhZmVFbWl0OiBmYWxzZSxcblx0XHRoaWVyYXJjaHk6IHt9LFxuXHRcdHBlbmRpbmdEZWxlZ2F0aW9uczoge31cblx0fTtcbn1cblxuZnVuY3Rpb24gZ2V0RGVmYXVsdENsaWVudE1ldGEoKSB7XG5cdHJldHVybiB7XG5cdFx0aW5wdXRRdWV1ZTogW10sXG5cdFx0dGFyZ2V0UmVwbGF5U3RhdGU6IFwiXCIsXG5cdFx0c3RhdGU6IHVuZGVmaW5lZCxcblx0XHRwcmlvclN0YXRlOiB1bmRlZmluZWQsXG5cdFx0cHJpb3JBY3Rpb246IFwiXCIsXG5cdFx0Y3VycmVudEFjdGlvbjogXCJcIixcblx0XHRjdXJyZW50QWN0aW9uQXJnczogdW5kZWZpbmVkLFxuXHRcdGluRXhpdEhhbmRsZXI6IGZhbHNlXG5cdH07XG59XG5cbmZ1bmN0aW9uIGdldExlYWtsZXNzQXJncyggYXJncywgc3RhcnRJZHggKSB7XG5cdHZhciByZXN1bHQgPSBbXTtcblx0Zm9yICggdmFyIGkgPSAoIHN0YXJ0SWR4IHx8IDAgKTsgaSA8IGFyZ3MubGVuZ3RoOyBpKysgKSB7XG5cdFx0cmVzdWx0WyBpIF0gPSBhcmdzWyBpIF07XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cbi8qXG5cdGhhbmRsZSAtPlxuXHRcdGNoaWxkID0gc3RhdGVPYmouX2NoaWxkICYmIHN0YXRlT2JqLl9jaGlsZC5pbnN0YW5jZTtcblxuXHR0cmFuc2l0aW9uIC0+XG5cdFx0bmV3U3RhdGVPYmouX2NoaWxkID0gZ2V0Q2hpbGRGc21JbnN0YW5jZSggbmV3U3RhdGVPYmouX2NoaWxkICk7XG5cdFx0Y2hpbGQgPSBuZXdTdGF0ZU9iai5fY2hpbGQgJiYgbmV3U3RhdGVPYmouX2NoaWxkLmluc3RhbmNlO1xuKi9cbmZ1bmN0aW9uIGdldENoaWxkRnNtSW5zdGFuY2UoIGNvbmZpZyApIHtcblx0aWYgKCAhY29uZmlnICkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgY2hpbGRGc21EZWZpbml0aW9uID0ge307XG5cdGlmICggdHlwZW9mIGNvbmZpZyA9PT0gXCJvYmplY3RcIiApIHtcblx0XHQvLyBpcyB0aGlzIGEgY29uZmlnIG9iamVjdCB3aXRoIGEgZmFjdG9yeT9cblx0XHRpZiAoIGNvbmZpZy5mYWN0b3J5ICkge1xuXHRcdFx0Y2hpbGRGc21EZWZpbml0aW9uID0gY29uZmlnO1xuXHRcdFx0Y2hpbGRGc21EZWZpbml0aW9uLmluc3RhbmNlID0gY2hpbGRGc21EZWZpbml0aW9uLmZhY3RvcnkoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gYXNzdW1pbmcgdGhpcyBpcyBhIG1hY2hpbmEgaW5zdGFuY2Vcblx0XHRcdGNoaWxkRnNtRGVmaW5pdGlvbi5mYWN0b3J5ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBjb25maWc7XG5cdFx0XHR9O1xuXHRcdH1cblx0fSBlbHNlIGlmICggdHlwZW9mIGNvbmZpZyA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdGNoaWxkRnNtRGVmaW5pdGlvbi5mYWN0b3J5ID0gY29uZmlnO1xuXHR9XG5cdGNoaWxkRnNtRGVmaW5pdGlvbi5pbnN0YW5jZSA9IGNoaWxkRnNtRGVmaW5pdGlvbi5mYWN0b3J5KCk7XG5cdHJldHVybiBjaGlsZEZzbURlZmluaXRpb247XG59XG5cbmZ1bmN0aW9uIGxpc3RlblRvQ2hpbGQoIGZzbSwgY2hpbGQgKSB7XG5cdC8vIE5lZWQgdG8gaW52ZXN0aWdhdGUgcG90ZW50aWFsIGZvciBkaXNjYXJkZWQgZXZlbnRcblx0Ly8gbGlzdGVuZXIgbWVtb3J5IGxlYWsgaW4gbG9uZy1ydW5uaW5nLCBkZWVwbHktbmVzdGVkIGhpZXJhcmNoaWVzLlxuXHRyZXR1cm4gY2hpbGQub24oIFwiKlwiLCBmdW5jdGlvbiggZXZlbnROYW1lLCBkYXRhICkge1xuXHRcdHN3aXRjaCAoIGV2ZW50TmFtZSApIHtcblx0XHRcdGNhc2UgZXZlbnRzLk5PX0hBTkRMRVI6XG5cdFx0XHRcdGlmICggIWRhdGEudGlja2V0ICYmICFkYXRhLmRlbGVnYXRlZCAmJiBkYXRhLm5hbWVzcGFjZSAhPT0gZnNtLm5hbWVzcGFjZSApIHtcblx0XHRcdFx0XHQvLyBPayAtIHdlJ3JlIGRlYWxpbmcgdy8gYSBjaGlsZCBoYW5kbGluZyBpbnB1dCB0aGF0IHNob3VsZCBidWJibGUgdXBcblx0XHRcdFx0XHRkYXRhLmFyZ3NbIDEgXS5idWJibGluZyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gd2UgZG8gTk9UIGJ1YmJsZSBfcmVzZXQgaW5wdXRzIHVwIHRvIHRoZSBwYXJlbnRcblx0XHRcdFx0aWYgKCBkYXRhLmlucHV0VHlwZSAhPT0gXCJfcmVzZXRcIiApIHtcblx0XHRcdFx0XHRmc20uaGFuZGxlLmFwcGx5KCBmc20sIGRhdGEuYXJncyApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBldmVudHMuSEFORExJTkcgOlxuXHRcdFx0XHR2YXIgdGlja2V0ID0gZGF0YS50aWNrZXQ7XG5cdFx0XHRcdGlmICggdGlja2V0ICYmIGZzbS5wZW5kaW5nRGVsZWdhdGlvbnNbIHRpY2tldCBdICkge1xuXHRcdFx0XHRcdGRlbGV0ZSBmc20ucGVuZGluZ0RlbGVnYXRpb25zWyB0aWNrZXQgXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmc20uZW1pdCggZXZlbnROYW1lLCBkYXRhICk7IC8vIHBvc3NpYmx5IHRyYW5zZm9ybSBwYXlsb2FkP1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGZzbS5lbWl0KCBldmVudE5hbWUsIGRhdGEgKTsgLy8gcG9zc2libHkgdHJhbnNmb3JtIHBheWxvYWQ/XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBfbWFjaEtleXMgYXJlIG1lbWJlcnMgd2Ugd2FudCB0byB0cmFjayBhY3Jvc3MgdGhlIHByb3RvdHlwZSBjaGFpbiBvZiBhbiBleHRlbmRlZCBGU00gY29uc3RydWN0b3Jcbi8vIFNpbmNlIHdlIHdhbnQgdG8gZXZlbnR1YWxseSBtZXJnZSB0aGUgYWdncmVnYXRlIG9mIHRob3NlIHZhbHVlcyBvbnRvIHRoZSBpbnN0YW5jZSBzbyB0aGF0IEZTTXNcbi8vIHRoYXQgc2hhcmUgdGhlIHNhbWUgZXh0ZW5kZWQgcHJvdG90eXBlIHdvbid0IHNoYXJlIHN0YXRlICpvbiogdGhvc2UgcHJvdG90eXBlcy5cbnZhciBfbWFjaEtleXMgPSBbIFwic3RhdGVzXCIsIFwiaW5pdGlhbFN0YXRlXCIgXTtcbnZhciBleHRlbmQgPSBmdW5jdGlvbiggcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMgKSB7XG5cdHZhciBwYXJlbnQgPSB0aGlzO1xuXHR2YXIgZnNtOyAvLyBwbGFjZWhvbGRlciBmb3IgaW5zdGFuY2UgY29uc3RydWN0b3Jcblx0dmFyIG1hY2hPYmogPSB7fTsgLy8gb2JqZWN0IHVzZWQgdG8gaG9sZCBpbml0aWFsU3RhdGUgJiBzdGF0ZXMgZnJvbSBwcm90b3R5cGUgZm9yIGluc3RhbmNlLWxldmVsIG1lcmdpbmdcblx0dmFyIEN0b3IgPSBmdW5jdGlvbigpIHt9OyAvLyBwbGFjZWhvbGRlciBjdG9yIGZ1bmN0aW9uIHVzZWQgdG8gaW5zZXJ0IGxldmVsIGluIHByb3RvdHlwZSBjaGFpblxuXG5cdC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3Vcblx0Ly8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG5cdC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cblx0aWYgKCBwcm90b1Byb3BzICYmIHByb3RvUHJvcHMuaGFzT3duUHJvcGVydHkoIFwiY29uc3RydWN0b3JcIiApICkge1xuXHRcdGZzbSA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gVGhlIGRlZmF1bHQgbWFjaGluYSBjb25zdHJ1Y3RvciAod2hlbiB1c2luZyBpbmhlcml0YW5jZSkgY3JlYXRlcyBhXG5cdFx0Ly8gZGVlcCBjb3B5IG9mIHRoZSBzdGF0ZXMvaW5pdGlhbFN0YXRlIHZhbHVlcyBmcm9tIHRoZSBwcm90b3R5cGUgYW5kXG5cdFx0Ly8gZXh0ZW5kcyB0aGVtIG92ZXIgdGhlIGluc3RhbmNlIHNvIHRoYXQgdGhleSdsbCBiZSBpbnN0YW5jZS1sZXZlbC5cblx0XHQvLyBJZiBhbiBvcHRpb25zIGFyZyAoYXJnc1swXSkgaXMgcGFzc2VkIGluLCBhIHN0YXRlcyBvciBpbnRpYWxTdGF0ZVxuXHRcdC8vIHZhbHVlIHdpbGwgYmUgcHJlZmVycmVkIG92ZXIgYW55IGRhdGEgcHVsbGVkIHVwIGZyb20gdGhlIHByb3RvdHlwZS5cblx0XHRmc20gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzID0gc2xpY2UuY2FsbCggYXJndW1lbnRzLCAwICk7XG5cdFx0XHRhcmdzWyAwIF0gPSBhcmdzWyAwIF0gfHwge307XG5cdFx0XHR2YXIgYmxlbmRlZFN0YXRlO1xuXHRcdFx0dmFyIGluc3RhbmNlU3RhdGVzID0gYXJnc1sgMCBdLnN0YXRlcyB8fCB7fTtcblx0XHRcdGJsZW5kZWRTdGF0ZSA9IF8ubWVyZ2UoIF8uY2xvbmVEZWVwKCBtYWNoT2JqICksIHsgc3RhdGVzOiBpbnN0YW5jZVN0YXRlcyB9ICk7XG5cdFx0XHRibGVuZGVkU3RhdGUuaW5pdGlhbFN0YXRlID0gYXJnc1sgMCBdLmluaXRpYWxTdGF0ZSB8fCB0aGlzLmluaXRpYWxTdGF0ZTtcblx0XHRcdF8uZXh0ZW5kKCBhcmdzWyAwIF0sIGJsZW5kZWRTdGF0ZSApO1xuXHRcdFx0cGFyZW50LmFwcGx5KCB0aGlzLCBhcmdzICk7XG5cdFx0fTtcblx0fVxuXG5cdC8vIEluaGVyaXQgY2xhc3MgKHN0YXRpYykgcHJvcGVydGllcyBmcm9tIHBhcmVudC5cblx0Xy5tZXJnZSggZnNtLCBwYXJlbnQgKTtcblxuXHQvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuXHQvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuXHRDdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG5cdGZzbS5wcm90b3R5cGUgPSBuZXcgQ3RvcigpO1xuXG5cdC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuXHQvLyBpZiBzdXBwbGllZC5cblx0aWYgKCBwcm90b1Byb3BzICkge1xuXHRcdF8uZXh0ZW5kKCBmc20ucHJvdG90eXBlLCBwcm90b1Byb3BzICk7XG5cdFx0Xy5tZXJnZSggbWFjaE9iaiwgXy50cmFuc2Zvcm0oIHByb3RvUHJvcHMsIGZ1bmN0aW9uKCBhY2N1bSwgdmFsLCBrZXkgKSB7XG5cdFx0XHRpZiAoIF9tYWNoS2V5cy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdGFjY3VtWyBrZXkgXSA9IHZhbDtcblx0XHRcdH1cblx0XHR9ICkgKTtcblx0fVxuXG5cdC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuXHRpZiAoIHN0YXRpY1Byb3BzICkge1xuXHRcdF8ubWVyZ2UoIGZzbSwgc3RhdGljUHJvcHMgKTtcblx0fVxuXG5cdC8vIENvcnJlY3RseSBzZXQgY2hpbGQncyBgcHJvdG90eXBlLmNvbnN0cnVjdG9yYC5cblx0ZnNtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGZzbTtcblxuXHQvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkIGxhdGVyLlxuXHRmc20uX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblx0cmV0dXJuIGZzbTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZVVVSUQoKSB7XG5cdHZhciBzID0gW107XG5cdHZhciBoZXhEaWdpdHMgPSBcIjAxMjM0NTY3ODlhYmNkZWZcIjtcblx0Zm9yICggdmFyIGkgPSAwOyBpIDwgMzY7IGkrKyApIHtcblx0XHRzWyBpIF0gPSBoZXhEaWdpdHMuc3Vic3RyKCBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMHgxMCApLCAxICk7XG5cdH1cblx0c1sgMTQgXSA9IFwiNFwiOyAvLyBiaXRzIDEyLTE1IG9mIHRoZSB0aW1lX2hpX2FuZF92ZXJzaW9uIGZpZWxkIHRvIDAwMTBcblx0LyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuXHRzWyAxOSBdID0gaGV4RGlnaXRzLnN1YnN0ciggKCBzWyAxOSBdICYgMHgzICkgfCAweDgsIDEgKTsgLy8gYml0cyA2LTcgb2YgdGhlIGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWQgdG8gMDFcblx0LyoganNoaW50IGlnbm9yZTplbmQgKi9cblx0c1sgOCBdID0gc1sgMTMgXSA9IHNbIDE4IF0gPSBzWyAyMyBdID0gXCItXCI7XG5cdHJldHVybiBzLmpvaW4oIFwiXCIgKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZVVVSUQ6IGNyZWF0ZVVVSUQsXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRnZXREZWZhdWx0QmVoYXZpb3JhbE9wdGlvbnM6IGdldERlZmF1bHRCZWhhdmlvcmFsT3B0aW9ucyxcblx0Z2V0RGVmYXVsdE9wdGlvbnM6IGdldERlZmF1bHRCZWhhdmlvcmFsT3B0aW9ucyxcblx0Z2V0RGVmYXVsdENsaWVudE1ldGE6IGdldERlZmF1bHRDbGllbnRNZXRhLFxuXHRnZXRDaGlsZEZzbUluc3RhbmNlOiBnZXRDaGlsZEZzbUluc3RhbmNlLFxuXHRnZXRMZWFrbGVzc0FyZ3M6IGdldExlYWtsZXNzQXJncyxcblx0bGlzdGVuVG9DaGlsZDogbGlzdGVuVG9DaGlsZCxcblx0bWFrZUZzbU5hbWVzcGFjZTogbWFrZUZzbU5hbWVzcGFjZVxufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3V0aWxzLmpzXG4vLyBtb2R1bGUgaWQgPSAzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRORVhUX1RSQU5TSVRJT046IFwidHJhbnNpdGlvblwiLFxuXHRIQU5ETElORzogXCJoYW5kbGluZ1wiLFxuXHRIQU5ETEVEOiBcImhhbmRsZWRcIixcblx0Tk9fSEFORExFUjogXCJub2hhbmRsZXJcIixcblx0VFJBTlNJVElPTjogXCJ0cmFuc2l0aW9uXCIsXG5cdFRSQU5TSVRJT05FRDogXCJ0cmFuc2l0aW9uZWRcIixcblx0SU5WQUxJRF9TVEFURTogXCJpbnZhbGlkc3RhdGVcIixcblx0REVGRVJSRUQ6IFwiZGVmZXJyZWRcIixcblx0TkVXX0ZTTTogXCJuZXdmc21cIlxufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2V2ZW50cy5qc1xuLy8gbW9kdWxlIGlkID0gNFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgQmVoYXZpb3JhbEZzbSA9IHJlcXVpcmUoIFwiLi9CZWhhdmlvcmFsRnNtXCIgKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoIFwiLi91dGlsc1wiICk7XG52YXIgXyA9IHJlcXVpcmUoIFwibG9kYXNoXCIgKTtcblxudmFyIEZzbSA9IHtcblx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKCkge1xuXHRcdEJlaGF2aW9yYWxGc20uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdHRoaXMuZW5zdXJlQ2xpZW50TWV0YSgpO1xuXHR9LFxuXHRpbml0Q2xpZW50OiBmdW5jdGlvbiBpbml0Q2xpZW50KCkge1xuXHRcdHZhciBpbml0aWFsU3RhdGUgPSB0aGlzLmluaXRpYWxTdGF0ZTtcblx0XHRpZiAoICFpbml0aWFsU3RhdGUgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiWW91IG11c3Qgc3BlY2lmeSBhbiBpbml0aWFsIHN0YXRlIGZvciB0aGlzIEZTTVwiICk7XG5cdFx0fVxuXHRcdGlmICggIXRoaXMuc3RhdGVzWyBpbml0aWFsU3RhdGUgXSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJUaGUgaW5pdGlhbCBzdGF0ZSBzcGVjaWZpZWQgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHN0YXRlcyBvYmplY3QuXCIgKTtcblx0XHR9XG5cdFx0dGhpcy50cmFuc2l0aW9uKCBpbml0aWFsU3RhdGUgKTtcblx0fSxcblx0ZW5zdXJlQ2xpZW50TWV0YTogZnVuY3Rpb24gZW5zdXJlQ2xpZW50TWV0YSgpIHtcblx0XHRpZiAoICF0aGlzLl9zdGFtcGVkICkge1xuXHRcdFx0dGhpcy5fc3RhbXBlZCA9IHRydWU7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLCBfLmNsb25lRGVlcCggdXRpbHMuZ2V0RGVmYXVsdENsaWVudE1ldGEoKSApICk7XG5cdFx0XHR0aGlzLmluaXRDbGllbnQoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZW5zdXJlQ2xpZW50QXJnOiBmdW5jdGlvbiggYXJncyApIHtcblx0XHR2YXIgX2FyZ3MgPSBhcmdzO1xuXHRcdC8vIHdlIG5lZWQgdG8gdGVzdCB0aGUgYXJncyBhbmQgdmVyaWZ5IHRoYXQgaWYgYSBjbGllbnQgYXJnIGhhc1xuXHRcdC8vIGJlZW4gcGFzc2VkLCBpdCBtdXN0IGJlIHRoaXMgRlNNIGluc3RhbmNlICh0aGlzIGlzbid0IGEgYmVoYXZpb3JhbCBGU00pXG5cdFx0aWYgKCB0eXBlb2YgX2FyZ3NbIDAgXSA9PT0gXCJvYmplY3RcIiAmJiAhKCBcImlucHV0VHlwZVwiIGluIF9hcmdzWyAwIF0gKSAmJiBfYXJnc1sgMCBdICE9PSB0aGlzICkge1xuXHRcdFx0X2FyZ3Muc3BsaWNlKCAwLCAxLCB0aGlzICk7XG5cdFx0fSBlbHNlIGlmICggdHlwZW9mIF9hcmdzWyAwIF0gIT09IFwib2JqZWN0XCIgfHwgKCB0eXBlb2YgX2FyZ3NbIDAgXSA9PT0gXCJvYmplY3RcIiAmJiAoIFwiaW5wdXRUeXBlXCIgaW4gX2FyZ3NbIDAgXSApICkgKSB7XG5cdFx0XHRfYXJncy51bnNoaWZ0KCB0aGlzICk7XG5cdFx0fVxuXHRcdHJldHVybiBfYXJncztcblx0fSxcblxuXHRnZXRIYW5kbGVyQXJnczogZnVuY3Rpb24oIGFyZ3MsIGlzQ2F0Y2hBbGwgKSB7XG5cdFx0Ly8gaW5kZXggMCBpcyB0aGUgY2xpZW50LCBpbmRleCAxIGlzIGlucHV0VHlwZVxuXHRcdC8vIGlmIHdlJ3JlIGluIGEgY2F0Y2gtYWxsIGhhbmRsZXIsIGlucHV0IHR5cGUgbmVlZHMgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGFyZ3Ncblx0XHQvLyBpbnB1dFR5cGUgbWlnaHQgYmUgYW4gb2JqZWN0LCBzbyB3ZSBuZWVkIHRvIGp1c3QgZ2V0IHRoZSBpbnB1dFR5cGUgc3RyaW5nIGlmIHNvXG5cdFx0dmFyIF9hcmdzID0gYXJncztcblx0XHR2YXIgaW5wdXQgPSBfYXJnc1sgMSBdO1xuXHRcdGlmICggdHlwZW9mIGlucHV0VHlwZSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdF9hcmdzLnNwbGljZSggMSwgMSwgaW5wdXQuaW5wdXRUeXBlICk7XG5cdFx0fVxuXHRcdHJldHVybiBpc0NhdGNoQWxsID9cblx0XHRcdF9hcmdzLnNsaWNlKCAxICkgOlxuXHRcdFx0X2FyZ3Muc2xpY2UoIDIgKTtcblx0fSxcblxuXHRnZXRTeXN0ZW1IYW5kbGVyQXJnczogZnVuY3Rpb24oIGFyZ3MsIGNsaWVudCApIHtcblx0XHRyZXR1cm4gYXJncztcblx0fSxcblxuXHQvLyBcImNsYXNzaWNcIiBtYWNoaW5hIEZTTSBkbyBub3QgZW1pdCB0aGUgY2xpZW50IHByb3BlcnR5IG9uIGV2ZW50cyAod2hpY2ggd291bGQgYmUgdGhlIEZTTSBpdHNlbGYpXG5cdGJ1aWxkRXZlbnRQYXlsb2FkOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYXJncyA9IHRoaXMuZW5zdXJlQ2xpZW50QXJnKCB1dGlscy5nZXRMZWFrbGVzc0FyZ3MoIGFyZ3VtZW50cyApICk7XG5cdFx0dmFyIGRhdGEgPSBhcmdzWyAxIF07XG5cdFx0aWYgKCBfLmlzUGxhaW5PYmplY3QoIGRhdGEgKSApIHtcblx0XHRcdHJldHVybiBfLmV4dGVuZCggZGF0YSwgeyBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlIH0gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHsgZGF0YTogZGF0YSB8fCBudWxsLCBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlIH07XG5cdFx0fVxuXHR9XG59O1xuXG5fLmVhY2goIFtcblx0XCJoYW5kbGVcIixcblx0XCJ0cmFuc2l0aW9uXCIsXG5cdFwiZGVmZXJVbnRpbFRyYW5zaXRpb25cIixcblx0XCJwcm9jZXNzUXVldWVcIixcblx0XCJjbGVhclF1ZXVlXCJcbl0sIGZ1bmN0aW9uKCBtZXRob2RXaXRoQ2xpZW50SW5qZWN0ZWQgKSB7XG5cdEZzbVsgbWV0aG9kV2l0aENsaWVudEluamVjdGVkIF0gPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgYXJncyA9IHRoaXMuZW5zdXJlQ2xpZW50QXJnKCB1dGlscy5nZXRMZWFrbGVzc0FyZ3MoIGFyZ3VtZW50cyApICk7XG5cdFx0cmV0dXJuIEJlaGF2aW9yYWxGc20ucHJvdG90eXBlWyBtZXRob2RXaXRoQ2xpZW50SW5qZWN0ZWQgXS5hcHBseSggdGhpcywgYXJncyApO1xuXHR9O1xufSApO1xuXG5Gc20gPSBCZWhhdmlvcmFsRnNtLmV4dGVuZCggRnNtICk7XG5cbm1vZHVsZS5leHBvcnRzID0gRnNtO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvRnNtLmpzXG4vLyBtb2R1bGUgaWQgPSA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfID0gcmVxdWlyZSggXCJsb2Rhc2hcIiApO1xudmFyIHV0aWxzID0gcmVxdWlyZSggXCIuL3V0aWxzXCIgKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSggXCIuL2VtaXR0ZXJcIiApO1xudmFyIHRvcExldmVsRW1pdHRlciA9IGVtaXR0ZXIuaW5zdGFuY2U7XG52YXIgZXZlbnRzID0gcmVxdWlyZSggXCIuL2V2ZW50c1wiICk7XG5cbnZhciBNQUNISU5BX1BST1AgPSBcIl9fbWFjaGluYV9fXCI7XG5cbmZ1bmN0aW9uIEJlaGF2aW9yYWxGc20oIG9wdGlvbnMgKSB7XG5cdF8uZXh0ZW5kKCB0aGlzLCBvcHRpb25zICk7XG5cdF8uZGVmYXVsdHMoIHRoaXMsIHV0aWxzLmdldERlZmF1bHRCZWhhdmlvcmFsT3B0aW9ucygpICk7XG5cdHRoaXMuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdHRvcExldmVsRW1pdHRlci5lbWl0KCBldmVudHMuTkVXX0ZTTSwgdGhpcyApO1xufVxuXG5fLmV4dGVuZCggQmVoYXZpb3JhbEZzbS5wcm90b3R5cGUsIHtcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7fSxcblxuXHRpbml0Q2xpZW50OiBmdW5jdGlvbiBpbml0Q2xpZW50KCBjbGllbnQgKSB7XG5cdFx0dmFyIGluaXRpYWxTdGF0ZSA9IHRoaXMuaW5pdGlhbFN0YXRlO1xuXHRcdGlmICggIWluaXRpYWxTdGF0ZSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJZb3UgbXVzdCBzcGVjaWZ5IGFuIGluaXRpYWwgc3RhdGUgZm9yIHRoaXMgRlNNXCIgKTtcblx0XHR9XG5cdFx0aWYgKCAhdGhpcy5zdGF0ZXNbIGluaXRpYWxTdGF0ZSBdICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIlRoZSBpbml0aWFsIHN0YXRlIHNwZWNpZmllZCBkb2VzIG5vdCBleGlzdCBpbiB0aGUgc3RhdGVzIG9iamVjdC5cIiApO1xuXHRcdH1cblx0XHR0aGlzLnRyYW5zaXRpb24oIGNsaWVudCwgaW5pdGlhbFN0YXRlICk7XG5cdH0sXG5cblx0Y29uZmlnRm9yU3RhdGU6IGZ1bmN0aW9uIGNvbmZpZ0ZvclN0YXRlKCBuZXdTdGF0ZSwgaW5zdGFudGlhdGVDbGllbnQgKSB7XG5cdFx0dmFyIG5ld1N0YXRlT2JqID0gdGhpcy5zdGF0ZXNbIG5ld1N0YXRlIF07XG5cdFx0dmFyIGNoaWxkO1xuXHRcdF8uZWFjaCggdGhpcy5oaWVyYXJjaHksIGZ1bmN0aW9uKCBjaGlsZExpc3RlbmVyLCBrZXkgKSB7XG5cdFx0XHRpZiAoIGNoaWxkTGlzdGVuZXIgJiYgdHlwZW9mIGNoaWxkTGlzdGVuZXIub2ZmID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdGNoaWxkTGlzdGVuZXIub2ZmKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0aWYgKCBuZXdTdGF0ZU9iai5fY2hpbGQgKSB7XG5cdFx0XHRpZiAoIGluc3RhbnRpYXRlQ2xpZW50ICkge1xuXHRcdFx0XHRuZXdTdGF0ZU9iai5fY2hpbGQgPSB1dGlscy5nZXRDaGlsZEZzbUluc3RhbmNlKCBuZXdTdGF0ZU9iai5fY2hpbGQgKTtcblx0XHRcdH1cblxuXHRcdFx0Y2hpbGQgPSBuZXdTdGF0ZU9iai5fY2hpbGQgJiYgbmV3U3RhdGVPYmouX2NoaWxkLmluc3RhbmNlO1xuXHRcdFx0dGhpcy5oaWVyYXJjaHlbIGNoaWxkLm5hbWVzcGFjZSBdID0gdXRpbHMubGlzdGVuVG9DaGlsZCggdGhpcywgY2hpbGQgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gY2hpbGQ7XG5cdH0sXG5cblx0ZW5zdXJlQ2xpZW50TWV0YTogZnVuY3Rpb24gZW5zdXJlQ2xpZW50TWV0YSggY2xpZW50ICkge1xuXHRcdGlmICggdHlwZW9mIGNsaWVudCAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJBbiBGU00gY2xpZW50IG11c3QgYmUgYW4gb2JqZWN0LlwiICk7XG5cdFx0fVxuXHRcdGNsaWVudFsgTUFDSElOQV9QUk9QIF0gPSBjbGllbnRbIE1BQ0hJTkFfUFJPUCBdIHx8IHt9O1xuXHRcdGlmICggIWNsaWVudFsgTUFDSElOQV9QUk9QIF1bIHRoaXMubmFtZXNwYWNlIF0gKSB7XG5cdFx0XHRjbGllbnRbIE1BQ0hJTkFfUFJPUCBdWyB0aGlzLm5hbWVzcGFjZSBdID0gXy5jbG9uZURlZXAoIHV0aWxzLmdldERlZmF1bHRDbGllbnRNZXRhKCkgKTtcblx0XHRcdHRoaXMuaW5pdENsaWVudCggY2xpZW50ICk7XG5cdFx0fVxuXHRcdHJldHVybiBjbGllbnRbIE1BQ0hJTkFfUFJPUCBdWyB0aGlzLm5hbWVzcGFjZSBdO1xuXHR9LFxuXG5cdGJ1aWxkRXZlbnRQYXlsb2FkOiBmdW5jdGlvbiggY2xpZW50LCBkYXRhICkge1xuXHRcdGlmICggXy5pc1BsYWluT2JqZWN0KCBkYXRhICkgKSB7XG5cdFx0XHRyZXR1cm4gXy5leHRlbmQoIGRhdGEsIHsgY2xpZW50OiBjbGllbnQsIG5hbWVzcGFjZTogdGhpcy5uYW1lc3BhY2UgfSApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4geyBjbGllbnQ6IGNsaWVudCwgZGF0YTogZGF0YSB8fCBudWxsLCBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlIH07XG5cdFx0fVxuXHR9LFxuXG5cdGdldEhhbmRsZXJBcmdzOiBmdW5jdGlvbiggYXJncywgaXNDYXRjaEFsbCApIHtcblx0XHQvLyBpbmRleCAwIGlzIHRoZSBjbGllbnQsIGluZGV4IDEgaXMgaW5wdXRUeXBlXG5cdFx0Ly8gaWYgd2UncmUgaW4gYSBjYXRjaC1hbGwgaGFuZGxlciwgaW5wdXQgdHlwZSBuZWVkcyB0byBiZSBpbmNsdWRlZCBpbiB0aGUgYXJnc1xuXHRcdC8vIGlucHV0VHlwZSBtaWdodCBiZSBhbiBvYmplY3QsIHNvIHdlIG5lZWQgdG8ganVzdCBnZXQgdGhlIGlucHV0VHlwZSBzdHJpbmcgaWYgc29cblx0XHR2YXIgX2FyZ3MgPSBhcmdzLnNsaWNlKCAwICk7XG5cdFx0dmFyIGlucHV0ID0gX2FyZ3NbIDEgXTtcblx0XHRpZiAoIHR5cGVvZiBpbnB1dCA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdF9hcmdzLnNwbGljZSggMSwgMSwgaW5wdXQuaW5wdXRUeXBlICk7XG5cdFx0fVxuXHRcdHJldHVybiBpc0NhdGNoQWxsID9cblx0XHRcdF9hcmdzIDpcblx0XHRcdFsgX2FyZ3NbIDAgXSBdLmNvbmNhdCggX2FyZ3Muc2xpY2UoIDIgKSApO1xuXHR9LFxuXG5cdGdldFN5c3RlbUhhbmRsZXJBcmdzOiBmdW5jdGlvbiggYXJncywgY2xpZW50ICkge1xuXHRcdHJldHVybiBbIGNsaWVudCBdLmNvbmNhdCggYXJncyApO1xuXHR9LFxuXG5cdGhhbmRsZTogZnVuY3Rpb24oIGNsaWVudCwgaW5wdXQgKSB7XG5cdFx0dmFyIGlucHV0RGVmID0gaW5wdXQ7XG5cdFx0aWYgKCB0eXBlb2YgaW5wdXQgPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiVGhlIGlucHV0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGUgRlNNJ3MgaGFuZGxlIG1ldGhvZCBpcyB1bmRlZmluZWQuIERpZCB5b3UgZm9yZ2V0IHRvIHBhc3MgdGhlIGlucHV0IG5hbWU/XCIgKTtcblx0XHR9XG5cdFx0aWYgKCB0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRpbnB1dERlZiA9IHsgaW5wdXRUeXBlOiBpbnB1dCwgZGVsZWdhdGVkOiBmYWxzZSwgdGlja2V0OiB1bmRlZmluZWQgfTtcblx0XHR9XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdHZhciBhcmdzID0gdXRpbHMuZ2V0TGVha2xlc3NBcmdzKCBhcmd1bWVudHMgKTtcblx0XHRpZiAoIHR5cGVvZiBpbnB1dCAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGFyZ3Muc3BsaWNlKCAxLCAxLCBpbnB1dERlZiApO1xuXHRcdH1cblx0XHRjbGllbnRNZXRhLmN1cnJlbnRBY3Rpb25BcmdzID0gYXJncy5zbGljZSggMSApO1xuXHRcdHZhciBjdXJyZW50U3RhdGUgPSBjbGllbnRNZXRhLnN0YXRlO1xuXHRcdHZhciBzdGF0ZU9iaiA9IHRoaXMuc3RhdGVzWyBjdXJyZW50U3RhdGUgXTtcblx0XHR2YXIgaGFuZGxlck5hbWU7XG5cdFx0dmFyIGhhbmRsZXI7XG5cdFx0dmFyIGlzQ2F0Y2hBbGwgPSBmYWxzZTtcblx0XHR2YXIgY2hpbGQ7XG5cdFx0dmFyIHJlc3VsdDtcblx0XHR2YXIgYWN0aW9uO1xuXHRcdGlmICggIWNsaWVudE1ldGEuaW5FeGl0SGFuZGxlciApIHtcblx0XHRcdGNoaWxkID0gdGhpcy5jb25maWdGb3JTdGF0ZSggY3VycmVudFN0YXRlLCBmYWxzZSApO1xuXHRcdFx0aWYgKCBjaGlsZCAmJiAhdGhpcy5wZW5kaW5nRGVsZWdhdGlvbnNbIGlucHV0RGVmLnRpY2tldCBdICYmICFpbnB1dERlZi5idWJibGluZyApIHtcblx0XHRcdFx0aW5wdXREZWYudGlja2V0ID0gKCBpbnB1dERlZi50aWNrZXQgfHwgdXRpbHMuY3JlYXRlVVVJRCgpICk7XG5cdFx0XHRcdGlucHV0RGVmLmRlbGVnYXRlZCA9IHRydWU7XG5cdFx0XHRcdHRoaXMucGVuZGluZ0RlbGVnYXRpb25zWyBpbnB1dERlZi50aWNrZXQgXSA9IHsgZGVsZWdhdGVkVG86IGNoaWxkLm5hbWVzcGFjZSB9O1xuXHRcdFx0XHQvLyBXQVJOSU5HIC0gcmV0dXJuaW5nIGEgdmFsdWUgZnJvbSBgaGFuZGxlYCBvbiBjaGlsZCBGU01zIGlzIG5vdCByZWFsbHkgc3VwcG9ydGVkLlxuXHRcdFx0XHQvLyBJZiB5b3UgbmVlZCB0byByZXR1cm4gdmFsdWVzIGZyb20gY2hpbGQgRlNNIGlucHV0IGhhbmRsZXJzLCB1c2UgZXZlbnRzIGluc3RlYWQuXG5cdFx0XHRcdHJlc3VsdCA9IGNoaWxkLmhhbmRsZS5hcHBseSggY2hpbGQsIGFyZ3MgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICggaW5wdXREZWYudGlja2V0ICYmIHRoaXMucGVuZGluZ0RlbGVnYXRpb25zWyBpbnB1dERlZi50aWNrZXQgXSApIHtcblx0XHRcdFx0XHRkZWxldGUgdGhpcy5wZW5kaW5nRGVsZWdhdGlvbnNbIGlucHV0RGVmLnRpY2tldCBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGhhbmRsZXJOYW1lID0gc3RhdGVPYmpbIGlucHV0RGVmLmlucHV0VHlwZSBdID8gaW5wdXREZWYuaW5wdXRUeXBlIDogXCIqXCI7XG5cdFx0XHRcdGlzQ2F0Y2hBbGwgPSAoIGhhbmRsZXJOYW1lID09PSBcIipcIiApO1xuXHRcdFx0XHRoYW5kbGVyID0gKCBzdGF0ZU9ialsgaGFuZGxlck5hbWUgXSB8fCB0aGlzWyBoYW5kbGVyTmFtZSBdICkgfHwgdGhpc1sgXCIqXCIgXTtcblx0XHRcdFx0YWN0aW9uID0gY2xpZW50TWV0YS5zdGF0ZSArIFwiLlwiICsgaGFuZGxlck5hbWU7XG5cdFx0XHRcdGNsaWVudE1ldGEuY3VycmVudEFjdGlvbiA9IGFjdGlvbjtcblx0XHRcdFx0dmFyIGV2ZW50UGF5bG9hZCA9IHRoaXMuYnVpbGRFdmVudFBheWxvYWQoXG5cdFx0XHRcdFx0Y2xpZW50LFxuXHRcdFx0XHRcdHsgaW5wdXRUeXBlOiBpbnB1dERlZi5pbnB1dFR5cGUsIGRlbGVnYXRlZDogaW5wdXREZWYuZGVsZWdhdGVkLCB0aWNrZXQ6IGlucHV0RGVmLnRpY2tldCB9XG5cdFx0XHRcdCk7XG5cdFx0XHRcdGlmICggIWhhbmRsZXIgKSB7XG5cdFx0XHRcdFx0dGhpcy5lbWl0KCBldmVudHMuTk9fSEFORExFUiwgXy5leHRlbmQoIHsgYXJnczogYXJncyB9LCBldmVudFBheWxvYWQgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuZW1pdCggZXZlbnRzLkhBTkRMSU5HLCBldmVudFBheWxvYWQgKTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBoYW5kbGVyLmFwcGx5KCB0aGlzLCB0aGlzLmdldEhhbmRsZXJBcmdzKCBhcmdzLCBpc0NhdGNoQWxsICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmVzdWx0ID0gaGFuZGxlcjtcblx0XHRcdFx0XHRcdHRoaXMudHJhbnNpdGlvbiggY2xpZW50LCBoYW5kbGVyICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuZW1pdCggZXZlbnRzLkhBTkRMRUQsIGV2ZW50UGF5bG9hZCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNsaWVudE1ldGEucHJpb3JBY3Rpb24gPSBjbGllbnRNZXRhLmN1cnJlbnRBY3Rpb247XG5cdFx0XHRcdGNsaWVudE1ldGEuY3VycmVudEFjdGlvbiA9IFwiXCI7XG5cdFx0XHRcdGNsaWVudE1ldGEuY3VycmVudEFjdGlvbkFyZ3MgPSB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cblx0dHJhbnNpdGlvbjogZnVuY3Rpb24oIGNsaWVudCwgbmV3U3RhdGUgKSB7XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdHZhciBjdXJTdGF0ZSA9IGNsaWVudE1ldGEuc3RhdGU7XG5cdFx0dmFyIGN1clN0YXRlT2JqID0gdGhpcy5zdGF0ZXNbIGN1clN0YXRlIF07XG5cdFx0dmFyIG5ld1N0YXRlT2JqID0gdGhpcy5zdGF0ZXNbIG5ld1N0YXRlIF07XG5cdFx0dmFyIGNoaWxkO1xuXHRcdHZhciBhcmdzID0gdXRpbHMuZ2V0TGVha2xlc3NBcmdzKCBhcmd1bWVudHMgKS5zbGljZSggMiApO1xuXHRcdGlmICggIWNsaWVudE1ldGEuaW5FeGl0SGFuZGxlciAmJiBuZXdTdGF0ZSAhPT0gY3VyU3RhdGUgKSB7XG5cdFx0XHRpZiAoIG5ld1N0YXRlT2JqICkge1xuXHRcdFx0XHRjaGlsZCA9IHRoaXMuY29uZmlnRm9yU3RhdGUoIG5ld1N0YXRlLCB0cnVlICk7XG5cdFx0XHRcdGlmICggY3VyU3RhdGVPYmogJiYgY3VyU3RhdGVPYmouX29uRXhpdCApIHtcblx0XHRcdFx0XHRjbGllbnRNZXRhLmluRXhpdEhhbmRsZXIgPSB0cnVlO1xuXHRcdFx0XHRcdGN1clN0YXRlT2JqLl9vbkV4aXQuY2FsbCggdGhpcywgY2xpZW50ICk7XG5cdFx0XHRcdFx0Y2xpZW50TWV0YS5pbkV4aXRIYW5kbGVyID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2xpZW50TWV0YS50YXJnZXRSZXBsYXlTdGF0ZSA9IG5ld1N0YXRlO1xuXHRcdFx0XHRjbGllbnRNZXRhLnByaW9yU3RhdGUgPSBjdXJTdGF0ZTtcblx0XHRcdFx0Y2xpZW50TWV0YS5zdGF0ZSA9IG5ld1N0YXRlO1xuXHRcdFx0XHR2YXIgZXZlbnRQYXlsb2FkID0gdGhpcy5idWlsZEV2ZW50UGF5bG9hZCggY2xpZW50LCB7XG5cdFx0XHRcdFx0ZnJvbVN0YXRlOiBjbGllbnRNZXRhLnByaW9yU3RhdGUsXG5cdFx0XHRcdFx0YWN0aW9uOiBjbGllbnRNZXRhLmN1cnJlbnRBY3Rpb24sXG5cdFx0XHRcdFx0dG9TdGF0ZTogbmV3U3RhdGVcblx0XHRcdFx0fSApO1xuXHRcdFx0XHR0aGlzLmVtaXQoIGV2ZW50cy5UUkFOU0lUSU9OLCBldmVudFBheWxvYWQgKTtcblx0XHRcdFx0aWYgKCBuZXdTdGF0ZU9iai5fb25FbnRlciApIHtcblx0XHRcdFx0XHRuZXdTdGF0ZU9iai5fb25FbnRlci5hcHBseSggdGhpcywgdGhpcy5nZXRTeXN0ZW1IYW5kbGVyQXJncyggYXJncywgY2xpZW50ICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmVtaXQoIGV2ZW50cy5UUkFOU0lUSU9ORUQsIGV2ZW50UGF5bG9hZCApO1xuXHRcdFx0XHRpZiAoIGNoaWxkICkge1xuXHRcdFx0XHRcdGNoaWxkLmhhbmRsZSggY2xpZW50LCBcIl9yZXNldFwiICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIGNsaWVudE1ldGEudGFyZ2V0UmVwbGF5U3RhdGUgPT09IG5ld1N0YXRlICkge1xuXHRcdFx0XHRcdHRoaXMucHJvY2Vzc1F1ZXVlKCBjbGllbnQsIGV2ZW50cy5ORVhUX1RSQU5TSVRJT04gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmVtaXQoIGV2ZW50cy5JTlZBTElEX1NUQVRFLCB0aGlzLmJ1aWxkRXZlbnRQYXlsb2FkKCBjbGllbnQsIHtcblx0XHRcdFx0c3RhdGU6IGNsaWVudE1ldGEuc3RhdGUsXG5cdFx0XHRcdGF0dGVtcHRlZFN0YXRlOiBuZXdTdGF0ZVxuXHRcdFx0fSApICk7XG5cdFx0fVxuXHR9LFxuXG5cdGRlZmVyVW50aWxUcmFuc2l0aW9uOiBmdW5jdGlvbiggY2xpZW50LCBzdGF0ZU5hbWUgKSB7XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdGlmICggY2xpZW50TWV0YS5jdXJyZW50QWN0aW9uQXJncyApIHtcblx0XHRcdHZhciBxdWV1ZWQgPSB7XG5cdFx0XHRcdHR5cGU6IGV2ZW50cy5ORVhUX1RSQU5TSVRJT04sXG5cdFx0XHRcdHVudGlsU3RhdGU6IHN0YXRlTmFtZSxcblx0XHRcdFx0YXJnczogY2xpZW50TWV0YS5jdXJyZW50QWN0aW9uQXJnc1xuXHRcdFx0fTtcblx0XHRcdGNsaWVudE1ldGEuaW5wdXRRdWV1ZS5wdXNoKCBxdWV1ZWQgKTtcblx0XHRcdHZhciBldmVudFBheWxvYWQgPSB0aGlzLmJ1aWxkRXZlbnRQYXlsb2FkKCBjbGllbnQsIHtcblx0XHRcdFx0c3RhdGU6IGNsaWVudE1ldGEuc3RhdGUsXG5cdFx0XHRcdHF1ZXVlZEFyZ3M6IHF1ZXVlZFxuXHRcdFx0fSApO1xuXHRcdFx0dGhpcy5lbWl0KCBldmVudHMuREVGRVJSRUQsIGV2ZW50UGF5bG9hZCApO1xuXHRcdH1cblx0fSxcblxuXHRkZWZlckFuZFRyYW5zaXRpb246IGZ1bmN0aW9uKCBjbGllbnQsIHN0YXRlTmFtZSApIHtcblx0XHR0aGlzLmRlZmVyVW50aWxUcmFuc2l0aW9uKCBjbGllbnQsIHN0YXRlTmFtZSApO1xuXHRcdHRoaXMudHJhbnNpdGlvbiggY2xpZW50LCBzdGF0ZU5hbWUgKTtcblx0fSxcblxuXHRwcm9jZXNzUXVldWU6IGZ1bmN0aW9uKCBjbGllbnQgKSB7XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdHZhciBmaWx0ZXJGbiA9IGZ1bmN0aW9uKCBpdGVtICkge1xuXHRcdFx0cmV0dXJuICggKCAhaXRlbS51bnRpbFN0YXRlICkgfHwgKCBpdGVtLnVudGlsU3RhdGUgPT09IGNsaWVudE1ldGEuc3RhdGUgKSApO1xuXHRcdH07XG5cdFx0dmFyIHRvUHJvY2VzcyA9IF8uZmlsdGVyKCBjbGllbnRNZXRhLmlucHV0UXVldWUsIGZpbHRlckZuICk7XG5cdFx0Y2xpZW50TWV0YS5pbnB1dFF1ZXVlID0gXy5kaWZmZXJlbmNlKCBjbGllbnRNZXRhLmlucHV0UXVldWUsIHRvUHJvY2VzcyApO1xuXHRcdF8uZWFjaCggdG9Qcm9jZXNzLCBmdW5jdGlvbiggaXRlbSApIHtcblx0XHRcdHRoaXMuaGFuZGxlLmFwcGx5KCB0aGlzLCBbIGNsaWVudCBdLmNvbmNhdCggaXRlbS5hcmdzICkgKTtcblx0XHR9LmJpbmQoIHRoaXMgKSApO1xuXHR9LFxuXG5cdGNsZWFyUXVldWU6IGZ1bmN0aW9uKCBjbGllbnQsIG5hbWUgKSB7XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdGlmICggIW5hbWUgKSB7XG5cdFx0XHRjbGllbnRNZXRhLmlucHV0UXVldWUgPSBbXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGZpbHRlciA9IGZ1bmN0aW9uKCBldm50ICkge1xuXHRcdFx0XHRyZXR1cm4gKCBuYW1lID8gZXZudC51bnRpbFN0YXRlICE9PSBuYW1lIDogdHJ1ZSApO1xuXHRcdFx0fTtcblx0XHRcdGNsaWVudE1ldGEuaW5wdXRRdWV1ZSA9IF8uZmlsdGVyKCBjbGllbnRNZXRhLmlucHV0UXVldWUsIGZpbHRlciApO1xuXHRcdH1cblx0fSxcblxuXHRjb21wb3NpdGVTdGF0ZTogZnVuY3Rpb24oIGNsaWVudCApIHtcblx0XHR2YXIgY2xpZW50TWV0YSA9IHRoaXMuZW5zdXJlQ2xpZW50TWV0YSggY2xpZW50ICk7XG5cdFx0dmFyIHN0YXRlID0gY2xpZW50TWV0YS5zdGF0ZTtcblx0XHR2YXIgY2hpbGQgPSB0aGlzLnN0YXRlc1tzdGF0ZV0uX2NoaWxkICYmIHRoaXMuc3RhdGVzW3N0YXRlXS5fY2hpbGQuaW5zdGFuY2U7XG5cdFx0aWYgKCBjaGlsZCApIHtcblx0XHRcdHN0YXRlICs9IFwiLlwiICsgY2hpbGQuY29tcG9zaXRlU3RhdGUoIGNsaWVudCApO1xuXHRcdH1cblx0XHRyZXR1cm4gc3RhdGU7XG5cdH1cbn0sIGVtaXR0ZXIuZ2V0SW5zdGFuY2UoKSApO1xuXG5CZWhhdmlvcmFsRnNtLmV4dGVuZCA9IHV0aWxzLmV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBCZWhhdmlvcmFsRnNtO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvQmVoYXZpb3JhbEZzbS5qc1xuLy8gbW9kdWxlIGlkID0gNlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiXSwic291cmNlUm9vdCI6IiJ9