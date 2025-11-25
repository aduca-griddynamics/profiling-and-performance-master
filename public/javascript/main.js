(function () {
    $( document ).ready(async function () {
        const $financesEl = $('#finances');
        await appendFinanceData($financesEl);
        await appendOperations();
        await appendUsers();
        $('#refreshOperations').bind( 'click', refreshOperations);
        $('#loadMoreUsers').bind( 'click', appendUsers);
    });

    const locale = 'en-US';
    const numberFormatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
    });

    const dateFormatter = new Intl.DateTimeFormat(locale);

    const ENDPOINTS = {
        ROOT: 'http://localhost:3000/api',
        OPERATIONS: 'operations',
        DIVIDENTS:  'dividents',
        DEPOSITS:   'deposits',
        GAINS:      'gains',
        USERS: 'users'
    };

    async function appendFinanceData (target) {
        showLoader(target);
        const dataTypes = ['dividents', 'deposits', 'gains'];
        for (let i = 0; i < dataTypes.length; i++){
            const type = dataTypes[i];
            const $el = target.find(`#${type}`);
            const data = await getFinanceData(type);
            $el.text(numberFormatter.format(data))
        }
        hideLoader(target);
    }

    async function appendOperations () {
        /*
            <tr>
              <th scope="row">1</th>
              <td>Mark</td>
              <td>sell</td>
              <td>$840</td>
            </tr>
         */
        const $operationsTable = $('#userOperations');
        showLoader($operationsTable);
        const operationsData = await getOperationsData();
        const tbody = document.createElement('tbody');
        storeTable(tbody);
        for (let i = 0; i < 100; i++) {
            const rowData = operationsData[i];
            const row = document.createElement('tr');
            const idCell = document.createElement('td');
            idCell.setAttribute('scope', 'row');
            idCell.innerText = rowData.id;
            row.appendChild(idCell);
            const nameCell = document.createElement('td');
            nameCell.innerText = rowData.user;
            row.appendChild(nameCell);
            const typeCell = document.createElement('td');
            typeCell.innerText = rowData.type;
            row.appendChild(typeCell);
            const amountCell = document.createElement('td');
            amountCell.innerText = numberFormatter.format(rowData.amount);
            row.appendChild(amountCell);

            tbody.appendChild(row);
        }
        $operationsTable.append(tbody);
        hideLoader($operationsTable);
    }


    async function refreshOperations() {
        const $operationsTable = $('#userOperations');
        const $rows = $operationsTable.find('tr');
        $rows.find('td').empty();
        await appendOperations();
        $rows.not(':first').remove();
        storeTable($operationsTable);
    }

    async function appendUsers () {
        /*
            <tr>
              <th scope="row">1</th>
              <td>Mark</td>
              <td>novice</td>
              <td>active</td>
              <td>11.11.2011</td>
              <td>$241</td>
              <td><button>delete</button></td>
            </tr>
         */
        const $usersTable = $('#userEarnings');
        showLoader($usersTable);
        const usersData = await getUsersData();
        const tbody = document.createElement('tbody');
        storeTable(tbody);
        $usersTable.append(tbody);
        for (let i = 0; i < 100; i++) {
            const rowData = usersData[i];
            const row = document.createElement('tr');
            tbody.appendChild(row);
            const idCell = document.createElement('td');
            idCell.setAttribute('scope', 'row');
            idCell.innerText = rowData.id;
            row.appendChild(idCell);
            const nameCell = document.createElement('td');
            nameCell.innerText = rowData.name;
            row.appendChild(nameCell);
            const levelCell = document.createElement('td');
            levelCell.innerText = rowData.level;
            row.appendChild(levelCell);
            const statusCell = document.createElement('td');
            statusCell.innerText = rowData.status;
            row.appendChild(statusCell);
            const registeredCell = document.createElement('td');
            registeredCell.innerText = dateFormatter.format(new Date(rowData.registered));
            row.appendChild(registeredCell);
            const currentEarningsCell = document.createElement('td');
            currentEarningsCell.innerText = numberFormatter.format(rowData.currentEarnings);
            row.appendChild(currentEarningsCell);
            const delCell = document.createElement('td');
            row.appendChild(delCell);
            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = 'delete';
            deleteBtn.classList.add('btn', 'btn-danger', 'btn-sm');
            deleteBtn.onclick = () => row.remove();
            delCell.appendChild(deleteBtn);
        }
        hideLoader($usersTable);
    }

    async function getFinanceData (type) {
        const endpoint = `${ENDPOINTS.ROOT}/${ENDPOINTS[type.toUpperCase()]}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        return data[type];
    }

    async function getOperationsData(rowsCount) {
        let endpoint = `${ENDPOINTS.ROOT}/${ENDPOINTS.OPERATIONS}`;
        if (rowsCount) {
            endpoint = endpoint + $.param({rowsCount})
        }
        const response = await fetch(endpoint);
        const data = await response.json();
        return data.operations;
    }

    async function getUsersData(rowsCount) {
        let endpoint = `${ENDPOINTS.ROOT}/${ENDPOINTS.USERS}`;
        if (rowsCount) {
            endpoint = endpoint + $.param({rowsCount})
        }
        const response = await fetch(endpoint);
        const data = await response.json();
        return data.users;
    }

    function getTop(element) {
        let offsetTop = 0;
        while(element) {
            offsetTop += element.offsetTop;
            element = element.offsetParent;
        }
        return offsetTop;
    }

    function getLeft(element) {
        let offsetLeft = 0;
        while(element) {
            offsetLeft += element.offsetLeft;
            element = element.offsetParent;
        }
        return offsetLeft;
    }

    function showLoader (element) {
        const clone = $('#loader').clone();
        clone.removeClass(['d-none']);
        clone.width(element.css('width'));
        clone.height(element.css('height'));
        const top = getTop(element[0]);
        const left = getLeft(element[0]);
        clone.offset({
            top,
            left
        });
        clone.appendTo('body');
        element.loader = clone;
    }

    function hideLoader(element) {
        element.loader.detach();
    }

    function storeTable(table) {
        if (!this.tables) {
            this.tables = [table];
            return;
        }
        this.tables.push(table);
    }
})();
