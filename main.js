"use strict";
const adapterName 		= require('./package.json').name.split('.').pop();
const utils 			= require("@iobroker/adapter-core");
const tools      	    = require(utils.controllerDir + '/lib/tools.js');

const WebSocket 		= require('ws');

let client;
let connected			= false;
let red					= 0;
let green				= 0;
let blue				= 0;

let reconnectTimer;

let adapter;
function startAdapter(options) {
    options = options || {};
    options.name = adapterName;

	adapter  = new utils.Adapter(options);

	adapter.on('stateChange', (_id, state) => {
        if (!state || state.ack) return;
        //adapter.log.info('try to control id ' + _id + ' with ' + JSON.stringify(state));
        // Try to find the object
		const id = adapter.idToDCS(_id);

		if (id && id.channel)
		{		 
			if (state.val === 'false') state.val = false;
            if (state.val === 'true')  state.val = true;
			if (parseInt(state.val) == state.val) state.val = parseInt(state.val);

			if (id.channel === 'red') {
				red = state.val;
			} else
			if (id.channel === 'green') {
				green = state.val;
			} else
			if (id.channel === 'blue') {
				blue = state.val;
			} 		

			if(connected)
			{
				if (id.channel === 'disconnect') {
					disconnect();
				} else
				if (id.channel === 'rainbow') {
					client.send("1");
				} else
				if (id.channel === 'wipeColor') {
					client.send("0"+ " " + red + " " + green +" "+ blue);
				}					
			}else{
				if (id.channel === 'connect') {
					connect();
				}
			}
		}
	});
	
	adapter.on('install', () => adapter.createDevice('root', {}));

	adapter.on('unload', callback => {
        try {
            if (adapter) {
				adapter.log && adapter.log.info && adapter.log.info('terminating');
				disconnect();
				client.removeEventListener("open", onConnected);
				client.removeEventListener("connectFailed", onConnectFailed);
				client.removeEventListener("close", onClose);
				client.removeEventListener("error", onError);
            }
            callback();
        } catch (e) {
            callback();
        }
    });

    adapter.on('ready', () => {
        adapter.getObject(adapter.namespace + '.root', (err, obj) => {
            if (!obj || !obj.common || !obj.common.name) {
                adapter.createDevice('root', {}, () => main());
            } else {
                main ();
            }
        });
	});
	
	return adapter;
}

function createStates() 
{
	const states = {
		'connect': {
			def:    false,
			type:   'boolean',
			read:   true,
			write:  true,
			role:   'button',
			name:	'Connect',
			desc:   'Connect to server'
		},
		'disconnect': {
			def:    false,
			type:   'boolean',
			read:   true,
			write:  true,
			role:   'button',
			name:	'Disconnect',
			desc:   'Disconnect from server'
		},
		'online': {
			def:    false,
			type:   'boolean',
			read:   true,
			write:  false,
			role:   'state',
			name:	'Connection Status',
			desc:   'Is the connection established'
		},
		'bri': {
			def:   '100',
			type:  'number',
			read:  true,
			write: true,
			role:  'state',
			name:	'Brightness',
			desc:  '0..100%'
		},
		'red': {
			def:   '0',
			type:  'number',
			read:  true,
			write: true,
			role:  'state',
			name:	'Red',
			desc:  '0..255'
		},
		'green': { 
			def:   '0',
			type:  'number',
			read:  true,
			write: true,
			role:  'state',
			name:	'Green',
			desc:  '0..255'
		},
		'blue': {
			def:   '0',
			type:  'number',
			read:  true,
			write: true,
			role:  'state',
			name:	'Blue',
			desc:  '0..255'
		},
		'rainbow': {
			def:    false,
			type:   'boolean',
			read:   true,
			write:  true,
			role:   'button',
			name:	'Rainbow effect',
			desc:   'Rainbow effect on/off'
		},
		'wipeColor': {    
			def:    false,
			type:   'boolean',
			read:   true,
			write:  true,
			role:   'button',
			name:	'Color wipe',
			desc:   'Change color effect on/off'
		}    
	};

	const states_list = [];
	for (const state in states) 
        states_list.push(state);
	
	for (let j = 0; j < states_list.length; j++)
        adapter.createState('root', 0, states_list[j], states[states_list[j]]);    
}

function main() 
{
	adapter.subscribeStates('*');
	createStates();	
	connect();
}

function connect()
{
	if(!connected)
	{
		client = new WebSocket('ws://'+adapter.config.ipaddress+':'+adapter.config.port+'/');
		client.addEventListener("open", onConnected);
		client.addEventListener("connectFailed", onConnectFailed);
		client.addEventListener("close", onClose);
		client.addEventListener("error", onError);
	}
}

function disconnect()
{
	client.close();
	connected = false;
	adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
	adapter.log.info("Disconnected");
	clearInterval(reconnectTimer);
}

function onConnected()
{
	adapter.log.info('Connection established');
	adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: true, ack: true});
	connected = true;
	clearInterval(reconnectTimer);
}

function onConnectFailed(error)
{
	adapter.log.info('Connect Error: ' + JSON.stringify(error));
	adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
	connected = false;	
	reconnectTimer = setInterval(connect, 10000);
}

function onClose(code, reason)
{
	adapter.log.info("Connection closed("+code+"): " + reason);
	adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
	connected = false;
	reconnectTimer = setInterval(connect, 10000);
}

function onError(error)
{
	adapter.log.info("Connection Error: " + JSON.stringify(error));
	adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
	connected = false;
	reconnectTimer = setInterval(connect, 10000);
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	module.exports = startAdapter;
} else {
	// otherwise start the instance directly
	startAdapter();
}