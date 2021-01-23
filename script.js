// close sale  and save/send data

class Order {
    constructor() {
        this._menu = [];
        this._previousSales = [];
        this._invoiceNumber = "";
        this._order = [];
        this._payment = {
            amountPaid: 0,
            type: "",
            changeTip: 0
        };
    }

    get menu() {
        return this._menu;
    }

    set menu(menuArray) {
        this._menu = [];

        menuArray.forEach(menuItem => {
            let currItem = {};
            currItem.sku = menuItem[0];
            currItem.description = menuItem[1];
            currItem.price = menuItem[2];
            currItem.taxRate = menuItem[3];
            currItem.image = menuItem[4];
            this._menu.push(currItem);
        })
    }

    get previousSales() {
        return this._previousSales;
    }

    set previousSales(salesData) {
        this._previousSales = salesData;
    }

    get invoiceNumber() {
        return this._invoiceNumber;
    }

    set invoiceNumber(num) {
        this._invoiceNumber = num.toString();
    }

    get order() {
        return this._order;
    }

    set order(data) {
        this._order = data;
    }

    get payment() {
        return this._payment;
    }

    set payment(payment) {
        this._payment = payment;
    }

    generateInvoiceNumber() {
        if (this.previousSales.length < 1 || this.previousSales == undefined) {
            this.invoiceNumber = 1;
        } else {
            let skuArray = this.previousSales.map(sku => sku[1]);
            let highest = skuArray.reduce(function(a, b) {
                return Math.max(a, b);
            });
            this.invoiceNumber = highest + 1;
        }
    }

    addOrderLine(quantity, data) {
        let currentLine = {};
        let lineData = JSON.parse(data)

        currentLine.sku = lineData.sku;
        currentLine.description = lineData.description;
        currentLine.quantity = quantity;
        currentLine.price = Utilities.roundToTwo(parseFloat(lineData.price));
        currentLine.subtotal = currentLine.quantity * currentLine.price;
        currentLine.tax = Utilities.roundToTwo(lineData.taxRate * currentLine.subtotal);

        this.order.push(currentLine);
        Ui.receiptDetails(this);
    }

    deleteOrderLine(index) {
        this.order.splice(index, 1);
        Ui.receiptDetails(this)
    }

    clearOrder() {
        this.order = [];

        Ui.receiptDetails(this);
    }
    getSummary() {
        const summary = {
            subtotal: 0,
            tax: 0,
            grandtotal: 0
        }

        this.order.forEach(orderLine => {
            summary.subtotal += orderLine.subtotal;
            summary.tax += orderLine.tax;
        })

        summary.grandtotal = summary.subtotal + summary.tax;

        return summary;
    }

    changePayment(input) {
        const orderGrandTotal = this.getSummary().grandtotal;
        if (input.amountPaid != null) this.payment.amountPaid = parseFloat(input.amountPaid);
        if (input.type != null) this.payment.type = input.type;
        if (this.payment.amountPaid >= orderGrandTotal) {
            this.payment.changeTip = this.payment.amountPaid - orderGrandTotal;
            Ui.closeButton(false);
        } else {
            this.payment.changeTip = 0;
            Ui.closeButton(true)
        }

        Ui.paymentSummary(this);
    }

    clearPayment() {
        this.payment = {
            amountPaid: 0,
            type: "",
            changeTip: 0
        };

        Ui.paymentSummary(this);
    }

    exportOrder(date) {
        this.order.forEach(orderLine => {
            let currentLine = [];
            currentLine[0] = date;
            currentLine[1] = this.invoiceNumber;
            currentLine[2] = orderLine.sku;
            currentLine[3] = orderLine.quantity;
            currentLine[4] = orderLine.price;
            currentLine[5] = orderLine.tax;

            previousSalesData.push(currentLine);
        })

        this.previousSalesData = previousSalesData;
    }

    exportPayment(date) {
        const currentPayment = [];
        const tipChange = Utilities.roundToTwo(this.payment.amountPaid - this.getSummary().grandtotal);

        currentPayment[0] = date;
        currentPayment[1] = this.invoiceNumber;
        currentPayment[2] = this.getSummary().grandtotal;
        currentPayment[3] = this.payment.type;

        if (this.payment.type == "cash") {
            currentPayment[4] = 0;
        } else {
            currentPayment[4] = tipChange;
        }
        paymentsData.push(currentPayment);
    }

    closeSale() {
        const date = new Date();
        this.exportOrder(date);
        this.exportPayment(date);
        this.previousSales = previousSalesData;

        Ui.hidePaypad(this);
        this.clearPayment();
        this.clearOrder();
        Ui.invoiceNumber(this);

    }
}

class Ui {

    static menu(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.menu.forEach(item => {
            let menuElement = `<img src="${item.image}'" alt="${item.description}" class="menu-img" style="width:150px;">
            <figcaption>${item.description}</figcaption>
            <figcaption>${Utilities.convertFloatToString(item.price)}</figcaption>`

            let node = document.createElement("figure");
            node.className = "menu-item";
            let dataString = JSON.stringify({ sku: `${item.sku}`, description: `${item.description}`, price: `${item.price}`, taxRate: `${item.taxRate}` })
            node.setAttribute("data-sku", dataString);
            node.innerHTML = menuElement;
            frag.appendChild(node);
        });

        document.getElementById('menu').appendChild(frag);

        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.addOrderLine(1, button.getAttribute("data-sku"));
            })
        })
    }

    static receiptDetails(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.order.forEach((orderLine, index) => {
            let receiptLine = `<td class="description">${orderLine.description}</td>
            <td class="quantity">${orderLine.quantity}</td>
            <td class="price">${Utilities.convertFloatToString(orderLine.price)}</td>
            <td class="subtotal">${Utilities.convertFloatToString(orderLine.subtotal)}</td>
            <td class="delete" data-delete="${index.toString()}"><i class="fas fa-backspace"></i></td>`

            let node = document.createElement("tr");
            node.setAttribute("data-index", `${index.toString()}`);
            node.innerHTML = receiptLine;
            frag.appendChild(node);
        });

        let receiptDetails = document.getElementById("receipt-details");
        while (receiptDetails.hasChildNodes()) {
            receiptDetails.removeChild(receiptDetails.childNodes[0]);
        }

        receiptDetails.appendChild(frag);
        this.summary(orderInstance);

        document.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.deleteOrderLine(parseInt(button.getAttribute("data-delete")));
            })
        })
    }

    static invoiceNumber(orderInstance) {
        orderInstance.generateInvoiceNumber();
        const invoiceNumber = orderInstance.invoiceNumber;
        document.getElementById('invoice-number').textContent = `Invoice# ${invoiceNumber}`
    }
    static summary(orderInstance) {
        const summary = orderInstance.getSummary();
        const subtotal = document.getElementById("subtotal-summary");
        const tax = document.getElementById("tax-summary");
        const grandtotal = document.getElementById("grandtotal-summary");

        subtotal.textContent = Utilities.convertFloatToString(summary.subtotal);
        tax.textContent = Utilities.convertFloatToString(summary.tax);
        grandtotal.textContent = Utilities.convertFloatToString(summary.grandtotal);
    }

    static showPaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "grid"
    }

    static hidePaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "none"
    }


    static paymentSummary(orderInstance) {
        document.getElementById('amount-paid').textContent = Utilities.convertFloatToString(orderInstance.payment.amountPaid);

        const changeTipTitle = document.getElementById('tip-change-title');
        const paymentType = document.getElementById('payment-type');

        if (orderInstance.payment.type === 'credit') {
            changeTipTitle.textContent = "Tip:";
            paymentType.textContent = "CC";
        } else if (orderInstance.payment.type === 'cash') {
            changeTipTitle.textContent = "Change:";
            paymentType.textContent = "Cash";
        } else {
            changeTipTitle.textContent = "Change:";
            paymentType.textContent = "";
        }

        document.getElementById("tip-change-value").textContent = Utilities.convertFloatToString(orderInstance.payment.changeTip);
    }


    static closeButton(bool) {
        const closeButton = document.getElementById('close-sale');
        if (bool) {
            closeButton.style.display = "none";
        } else {
            closeButton.style.display = "grid";
        }
    }
}

class Utilities {

    static convertFloatToString(float) {
        let priceParams = {
            style: "currency",
            currency: "USD"
        };

        return float.toLocaleString("en-us", priceParams);
    }

    static roundToTwo(num) {
        return +(Math.round(num + "e+2") + "e-2");
    }

    static paypad(input, orderInstance) {
        if (!isNaN(parseInt(input))) {
            this.numberPaypad(parseInt(input), orderInstance);
        } else if (input === "back") {
            this.backPaypad(orderInstance);
        } else if (input === "clear") {
            this.clearPaypad(orderInstance);
        } else {
            orderInstance.closeSale();
        }
    }

    static numberPaypad(input, orderInstance) {
        const currentInput = this.roundToTwo(input * .01);
        const currentAmountPaid = this.roundToTwo(orderInstance.payment.amountPaid);
        const newAmountPaid = this.roundToTwo((currentAmountPaid * 10) + currentInput);

        if (currentAmountPaid === 0) {
            orderInstance.changePayment({ amountPaid: currentInput });
        } else {
            orderInstance.changePayment({ amountPaid: newAmountPaid });
        }
    }

    static backPaypad(orderInstance) {
        const currentPayment = orderInstance.payment.amountPaid;

        if (currentPayment > 0) {
            const toSubtract = ((currentPayment * 100) % 10) * 0.01;
            const newAmount = (currentPayment - toSubtract) * 0.1;
            orderInstance.changePayment({ amountPaid: newAmount });
        }
    }

    static clearPaypad(orderInstance) {
        orderInstance.changePayment({ amountPaid: 0 });
    }
}




//------------------------------------------------- MOCK DATA
const menuData = [
    [101, 'Hamburger', 10.99, 0.05, 'https://i.ibb.co/Vq2Ny7x/burger-min.jpg'],
    [102, 'Fries', 6.99, 0.05, 'https://i.ibb.co/LZj9Z6C/fries-min.jpg'],
    [103, 'Salad', 9.5, 0.05, 'https://i.ibb.co/yyPbfKy/salad-min.jpg'],
    [104, 'Pizza', 24.75, 0.05, 'https://i.ibb.co/B2xPpKg/pizza-min.jpg'],
    [105, 'Cake', 7.0, 0.05, 'https://i.ibb.co/pfXKGPN/cake-min.jpg'],
    [106, 'Donuts', 5.45, 0.05, 'https://i.ibb.co/8N0N8qs/donuts-min.jpg'],
    [107, 'Crepes', 12.5, 0.05, 'https://i.ibb.co/Fb8CQnj/crepes-min.jpg'],
    [108, 'Cupcake', 3.55, 0.05, 'https://i.ibb.co/s38mNCT/cupcake-min.jpg'],
    [109, 'Sandwich', 8.99, 0.05, 'https://i.ibb.co/GHK7JZT/sandwich-min.jpg'],
    [110, 'Steak', 26.98, 0.05, 'https://i.ibb.co/Dr7qFyk/steak-min.jpg'],
    [111, 'Veggie Thali', 13.45, 0.05, 'https://i.ibb.co/QjpPR3M/thali-min.jpg'],
    [112, 'Sushi', 18.26, 0.05, 'https://i.ibb.co/FnBRhmF/sushi-min.jpg'],
    [113, 'Chicken Tenders', 6.79, 0.05, 'https://i.ibb.co/z5XX7wq/chickentenders-min.jpg'],
    [114, 'Sorbet', 5.75, 0.05, 'https://i.ibb.co/z4vdbw4/sorbet-min.jpg'],
    [115, 'Dumplings', 11.45, 0.05, 'https://i.ibb.co/kckDb4D/dumplings-min.jpg']
];

const previousSalesData = [
    ["", 4999, 101.0, 1.0, 10.99, 0.5495],
    ["", 4999, 102.0, 2.0, 7.95, 0.3975],
    ["", 4999, 103.0, 3.0, 8.96, 0.45],
    ["", 5000, 106.0, 1.0, 6.99, 0.35],
    ["", 5000, 107.0, 1.0, 5.95, 0.30]
];

const paymentsData = [
    ["", 4999, 56.46, "cc", 5.00],
    ["", 5000, 13.59, "cash", 0]
]

//-----------------------------------------------ORDER INSTANTIATION
const order = new Order();
order.menu = menuData;
order.previousSales = previousSalesData;
Ui.menu(order);
Ui.invoiceNumber(order);



//----------------------------------------------STATIC EVENT LISTENERS

document.getElementById('clear-order').addEventListener('click', () => {
    order.clearOrder();
})

document.querySelectorAll('.paypad-show').forEach(button => {
    button.addEventListener('click', () => {
        Ui.showPaypad(order);
        order.changePayment(JSON.parse(button.getAttribute("data-payment-type")));
    })
})

document.getElementById('paypad-close').addEventListener('click', () => {
    order.clearPayment();
    Ui.hidePaypad(order);
})

document.querySelectorAll('.paypad-btn').forEach(button => {
    button.addEventListener('click', () => {
        Utilities.paypad(button.getAttribute("data-id"), order);
    })
})