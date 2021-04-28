document.addEventListener('DOMContentLoaded', async () => {

    try {
        agGrid.LicenseManager.setLicenseKey("your license key");

        window.mdc.autoInit();

        window.tab = null;

        window.dom = {
            progress: document.querySelector('#progress'),
            grid: document.querySelector('#grid'),
            tabBar: document.querySelector('.mdc-tab-bar')
        };
        dom.progress.classList.add('mdc-linear-progress--closed');


        window.gridOptions = {
            columnDefs: [],
            rowData: [],
            sideBar: false,
            rowSelection: 'multiple',
            groupSelectsChildren: false,
            suppressRowClickSelection: true,
            suppressAggFuncInHeader: true,
            animateRows: true,
            enableRangeSelection: true,
            rowDragManaged: true,
            defaultColDef: {
                enableRowGroup: true,
                enableValue: true,
                sortable: true,
                editable: false,
                filter: true,
                resizable: true
            },
            onCellClicked: event => {
                // 方便debug
                console.log(event);
            },
            onSelectionChanged: event => {
            },
            autoGroupColumnDef: {
                headerName: "Select",
                sort: 'asc',
                width: 300,
                headerCheckboxSelection: true,
                headerCheckboxSelectionFilteredOnly: true,
                checkboxSelection: params => params.node.group === true,
                cellRenderer: 'agGroupCellRenderer',
                // cellRendererParams: {
                // checkbox: params => params.node.group === true
                // }
            },
            aggFuncs: {
                'First': values => values.find(v => v)
            },
        }
        new agGrid.Grid(dom.grid, window.gridOptions);



        // 暴力定位
        (window.onresize = () => {
            dom.grid.style.width = document.body.offsetWidth + 'px';
            dom.grid.style.height = document.body.offsetHeight - dom.tabBar.offsetHeight + 'px';
        })();


        // init
        window.user = await curd.login({})

        const { humanList, skillList, cfg } = await curd.getProjectedAll();

        window.data = {
            humanList: humanList.map(h => {
                if (!h._role) h._role = '_undefined';
                return h;
            }),
            skillList,
        }
        window.cfg = cfg;
        setRoles();



    } catch (err) { alert(err.message || err) };

});

// 点击第一个标签页
async function setRoles() {
    if (window.tab === 'type') {
        user._typeList = gridOptions.api.getSelectedNodes().filter(n => n.group && n.field === '_type').map(n => n.key);
    }

    window.tab = 'role';

    const columnDefs = [{
        headerName: 'Count',
        field: '_count',
        width: 100,
        aggFunc: 'count',
        type: "numericColumn",
    }, {
        headerName: 'Person',
        field: '_id',
        width: 220
    }, {
        headerName: 'Role',
        field: '_role',
        rowGroup: true,
        width: 220,
    }, {
        headerName: 'Level',
        field: '_lv',
        width: 120,
    }, {
        headerName: 'Owner',
        field: '_owner',
        width: 220,
        aggFunc: 'First',
    }, {
        headerName: 'About',
        field: '_info',
    }];
    window.gridOptions.api.setColumnDefs(columnDefs);

    const rowData = window.data.humanList;
    window.gridOptions.api.setRowData(rowData);


    gridOptions.api.forEachNode(node => {
        if (node.field === '_role' && user._roleList.includes(node.key)) {
            node.setSelected(true);
            node.setExpanded(true);
        }
    });

    await new Promise(res => setTimeout(res, 1))

    gridOptions.columnApi.autoSizeAllColumns();
}


// 点击第二个标签页
async function setTypes() {
    if (window.tab === 'role') {
        user._roleList = gridOptions.api.getSelectedNodes().filter(n => n.group && n.field === '_role').map(n => n.key);
    }
    window.tab = 'type';

    const columnDefs = [{
        headerName: 'Count',
        field: '_count',
        width: 100,
        aggFunc: 'count',
        type: "numericColumn",
    }, {
        headerName: 'Skill',
        field: '_id',
        width: 220
    }, {
        headerName: 'Skill-Type',
        field: '_type',
        rowGroup: true,
        width: 220

    }, {
        headerName: 'Owner',
        field: '_owner',
        width: 220,
        aggFunc: 'First',
    }, {
        headerName: 'About',
        field: '_info',
    }];
    window.gridOptions.api.setColumnDefs(columnDefs);

    const rowData = window.data.skillList;
    window.gridOptions.api.setRowData(rowData);


    gridOptions.api.forEachNode(node => {
        if (node.field === '_type' && user._typeList.includes(node.key)) {
            node.setSelected(true);
            node.setExpanded(true);
        }
    });

    await new Promise(res => setTimeout(res, 1))

    gridOptions.columnApi.autoSizeAllColumns();
}



function submit() {
    // 保存
    if (window.tab === 'role') {
        user._roleList = gridOptions.api.getSelectedNodes()
            .filter(n => n.group && n.field === '_role')
            .map(n => n.key);
    } else if (window.tab === 'type') {
        user._typeList = gridOptions.api.getSelectedNodes()
            .filter(n => n.group && n.field === '_type')
            .map(n => n.key);
    } else { }

    curd.setHuman({
        _id: user._id,
        _roleList: user._roleList,
        _typeList: user._typeList
    }).then(end)
        .catch(err => alert(err.message));
}



// template to account setting
function copyAccount() {
    const _id = prompt(`Apply another's Role List & Skill-Type List 2 u:`, 'somebody@gmail.com');
    if (!_id) return;
    curd.copyAccount({
        _id: _id.toLowerCase()
    }).then(end)
        .then(() => location.reload())
        .catch(err => alert(err.message));
}


// 重置密码 --> logout
function reset_pwd() {
    const _pwd = prompt('Enter ur new password:');
    if (!_pwd) return;
    if (_pwd !== prompt('Re-enter ur password')) {
        alert('not match!');
        return;
    };
    curd.setHuman({
        _id: user._id,
        _pwd
    }).then(end)
        .catch(err => alert(err.message));
}



// curd成功后
function end() {
    if (window.opener) {
        window.opener.postMessage('updated', '*');
        if (confirm('Updated, close the window?')) window.close();
    } else if (confirm('Updated, return 2 origin page?')) {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        window.location.href = '/';
    }
}



