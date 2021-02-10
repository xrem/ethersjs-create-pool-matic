const maticvigilAppId = "put your app id here";
const privateKey = "0x....put-your-key-here.....";

if (maticvigilAppId.length !== 40) {
    console.error("Invalid matic vigil app id");
    return;
}

if (privateKey.length !== 66) {
    console.error("Invalid private key");
    return;
}

const { ethers } = require('ethers');
const abi = require('./abi.json');

const chainId = 137;
const contractAddress = "0xd7516F658837C3cCb365296BA4227d15Ebfd1986";
const wsRpcEndpoint = "wss://rpc-mainnet.maticvigil.com/ws/v1/" + maticvigilAppId;

function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

function handleEvent(...args) {
    const contractEvent = args.slice(-1)[0];
    console.log(`Contract \'${contractEvent.event}\' event received`);
}

const provider = new ethers.providers.WebSocketProvider(
    wsRpcEndpoint,
    chainId,
);

provider.on('debug', (info) => {
    switch (info.action) {
        case 'request':
            console.log(info.action, info.request);
            break;
        case 'response':
            console.log(info.action, info.response);
            break;
        default:
            console.log(info);
            break;
    }
});

provider.ready.then(async (network) => {
    console.log(`Established WS connection to ${JSON.stringify(network, null, 2)}`);

    const wallet = new ethers.Wallet(
        privateKey,
        provider
    );
    console.log(`Connected wallet: ${wallet.address}`);

    const contract = new ethers.Contract(
        contractAddress,
        abi,
        wallet
    );
    const eventsToListen = [
        'NewPool',
        'Bet',
        'Collect',
        'Trigger',
    ];
    for (const eventSignature in contract.interface.events) {
        if (
            !eventsToListen.some((eventName) =>
                eventSignature.startsWith(eventName),
            )
        ) {
            continue;
        }
        console.log(`Registering subscription for '${eventSignature}'`);
        contract.on(eventSignature, handleEvent.bind(this));
    }

    const currentBlockNumber = await provider.getBlockNumber();

    const createPoolFunc = contract.functions['createPool'];
    // https://explorer-mainnet.maticvigil.com/address/0xd7516F658837C3cCb365296BA4227d15Ebfd1986/logs
    console.log('Creating pool...');
    const tx = await createPoolFunc(
        '0xe6b8a5cf854791412c1f6efc7caf629f5df1c747', // token
        '0xd0d5e3db44de05e9f294bb0a3beeaf030de24ada', // feed
        ethers.utils.parseEther('12.172901'), // price
        0, // minBet
        currentBlockNumber + 10, // start
        200, // startPeriod
        currentBlockNumber + 10 + 200 + 1, // end
        1000, // endPeriod
    );
    console.log('Waiting tx confirmation...');
    await tx.wait(2);
    console.log('Transaction confirmed, eth_unsubscribe should automatically happen soon.');
    await delay(5000); // just waiting for 5 seconds;
    console.log('Probably everything is fine');
}).catch((e) => {
    console.error('Something went wrong: ', e);
});
