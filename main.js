"use strict";
const adapterName 		= require('./package.json').name.split('.').pop();
const utils 			= require("@iobroker/adapter-core");

const WebSocketClient 	= require('websocket').client;


let client;
let conn;
let adapter;
function startAdapter(options) {
    options = options || {};
    options.name = adapterName;

	adapter  = new utils.Adapter(options);

	adapter.on('stateChange', (_id, state) => {
        if (!state || state.ack) return;
        adapter.log.info('try to control id ' + _id + ' with ' + JSON.stringify(state));
        // Try to find the object
		const id = adapter.idToDCS(_id);

		if (id)
		{
			if (id.state === 'rainbow') {
				if (!!state.val) {
					conn.sendUTF("1");
				}
			} else
			if (id.state === 'colorWipe') {
				if (!!state.val) {
					conn.sendUTF("0"+ " " + adapter.getState('r').val + " " + adapter.getState('g').val +" "+ adapter.getState('b').val);
				}
			} 			
		}
	});
	
	adapter.on('install', () => adapter.createDevice('root', {}));

	adapter.on('unload', callback => {
        try {
            if (adapter) {
                adapter.log && adapter.log.info && adapter.log.info('terminating');
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
		'online': {
			def:    false,
			type:   'boolean',
			read:   true,
			write:  true,
			role:   'state',
			min:    false,
			max:    true,
			name:	'Connection Status',
			desc:   'Is the connection established'
		},
		'bri': {
			def:   '100',
			type:  'number',
			read:  false,
			write: true,
			role:  'state',
			name:	'Brightness',
			desc:  '0..100%'
		},
		'red': {
			def:   '0',
			type:  'number',
			read:  false,
			write: true,
			role:  'state',
			name:	'Red',
			desc:  '0..255'
		},
		'green': { 
			def:   '0',
			type:  'number',
			read:  false,
			write: true,
			role:  'state',
			name:	'Green',
			desc:  '0..255'
		},
		'blue': {
			def:   '0',
			type:  'number',
			read:  false,
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
			role:   'state',
			min:    false,
			max:    true,
			name:	'Rainbow effect',
			desc:   'Rainbow effect on/off'
		},
		'wipeColor': {    
			def:    false,
			type:   'boolean',
			read:   true,
			write:  true,
			role:   'state',
			min:    false,
			max:    true,
			name:	'Color wipe',
			desc:   'Change color effect on/off'
		}    
	};

	const states_list = [];
    for (const state in states) {
        states_list.push(state);
	}
	
	for (let j = 0; j < states_list.length; j++) {
        adapter.createState('root', 0, states_list[j], states[states_list[j]]);
    }
}

function main() 
{
	adapter.subscribeStates('*');
	createStates();

	client = new WebSocketClient();
	client.connect('ws://'+adapter.config.ipaddress+':'+adapter.config.port+'/', 'echo-protocol');

	client.on('connectFailed', function(error) {
		console.log('Connect Error: ' + error.toString());
		adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
	});
	
	client.on('connect', function(connection) {
		conn = connection;
		adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: true, ack: true});

		connection.on('error', function(error) {
			console.log("Connection Error: " + error.toString());
			adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
		});
		connection.on('close', function() {
			console.log('echo-protocol Connection Closed');
			adapter.setState({device: 'root', channel: 0, state: 'online'}, {val: false, ack: true});
		});
	});
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	module.exports = startAdapter;
} else {
	// otherwise start the instance directly
	startAdapter();
}