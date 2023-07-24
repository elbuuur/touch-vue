const API_KEY = '2f4bcf8c237ecec3d91daa82cd842e86d4a819cf30ed85ae2855b97179464f72';
const AGGREGATE_INDEX = "5";
const ERROR_CODE = 'INVALID_SUB'

const tickersHandlers = new Map();
const socket = new WebSocket(
    `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);


socket.addEventListener("message", e => {
    const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice, MESSAGE: message, PARAMETER: parameter } = JSON.parse(
        e.data
    );

    if(message === ERROR_CODE) {
        const tickerName = SubscriptionStringManager.getTickerName(parameter)
        const handlers = tickersHandlers.get(tickerName) ?? [];

        handlers.forEach(({_, rejectCb}) => rejectCb());
        return;
    }

    if (type !== AGGREGATE_INDEX || newPrice === undefined) {
        return;
    }

    const handlers = tickersHandlers.get(currency) ?? [];

    handlers.forEach(({successCb, _}) => successCb(newPrice));
});

function sendToWebSocket(message) {
    const stringifiedMessage = JSON.stringify(message);

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(stringifiedMessage);
        return;
    }

    socket.addEventListener(
        "open",
        () => {
            socket.send(stringifiedMessage);
        },
        { once: true }
    );
}

function subscribeToTickerOnWs(ticker) {
    sendToWebSocket({
        action: "SubAdd",
        subs: [`5~CCCAGG~${ticker}~USD`]
    });
}

function unsubscribeFromTickerOnWs(ticker) {
    sendToWebSocket({
        action: "SubRemove",
        subs: [SubscriptionStringManager.getSubscriptionString(ticker)]
    });
}

export const subscribeToTicker = (ticker, successCb, rejectCb) => {
    const subscribers = tickersHandlers.get(ticker) || [];
    tickersHandlers.set(ticker, [...subscribers, {successCb, rejectCb}]);
    subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
    tickersHandlers.delete(ticker);
    unsubscribeFromTickerOnWs(ticker);
};

export async function loadCoinList() {
    const response = await fetch('https://min-api.cryptocompare.com/data/all/coinlist?summary=true')

    return (await response.json()).Data
}

class SubscriptionStringManager {

    static getSubscriptionString(ticker) {
        return `5~CCCAGG~${ticker}~USD`
    }

    static getTickerName(subscriptionString) {
        return subscriptionString.split('~')[2]
    }
}