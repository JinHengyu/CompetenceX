document.addEventListener('DOMContentLoaded', async () => {


    // init all material elements
    window.mdc.autoInit();
    window.dom = {
        MDCDrawer: document.querySelector('.mdc-drawer').MDCDrawer,
        MDCTopAppBar: document.querySelector('.mdc-top-app-bar').MDCTopAppBar,
        MDCSnackbar: document.querySelector('.mdc-snackbar').MDCSnackbar,
        MDCMenu: document.querySelector('.mdc-menu').MDCMenu,

        // dialogs
        login: document.querySelector('#login').MDCDialog,
        editor: document.querySelector('#editor').MDCDialog,
        radar: document.querySelector('#radar').MDCDialog,
        msg: document.querySelector('#msg').MDCDialog,

        progress: document.querySelector('#progress'),
        grid: document.querySelector('#grid'),
        _id: document.querySelector('#_id'),
        _pwd: document.querySelector('#_pwd'),
        _db: document.querySelector('#_db'),

    };

    // 判断是否登录
    window.user = null;

    dom.MDCTopAppBar.setScrollTarget(document.querySelector('.mdc-drawer-app-content'));
    dom.MDCTopAppBar.listen('MDCTopAppBar:nav', () => {
        dom.MDCDrawer.open = !dom.MDCDrawer.open;
    });

    dom.MDCDrawer.open = false;





    // init
    if (document.head.querySelector('meta[name="user"]').getAttribute('content'))
        init();
    else login();








    (window.onresize = () => {
        // 不再依赖css, 直接暴力定位
        dom.grid.style.width = window.innerWidth + 'px';
        dom.grid.style.height = window.innerHeight - document.querySelector('.mdc-top-app-bar').offsetHeight + 'px';
    })();



    window.addEventListener('message', event => {
        if (!event.origin.includes(location.hostname)) return;
        if (event.data === 'updated') {
            document.querySelector('#msg .mdc-dialog__content').textContent = 'Account update detected, reload page?';
            document.querySelector('#msg [data-mdc-dialog-action="reload"]').onclick = () => location.reload();
            dom.msg.open();
        }
    }, false);



});
// init end




async function init() {
    try {

        user = await curd.login({})
        window.user = user;
        const { humanList, unitList, skillList, cfg } = await curd.getFilteredAll();
        // if (humanList.length === 0) humanList.push({ _id: '_none', _role: '_null' });
        // if (skillList.length === 0) skillList.push({ _id: '_none', _type: '_none' });



        // 把user强行指定的type下的skill分配units：保证unitList和表格的一致性
        skillList.filter(s => user._typeList.includes(s._type)).forEach(skill => {
            humanList.forEach(human => {
                if (!unitList.find(u => u._human === human._id && u._skill === skill._id)) {
                    // 空的unit
                    unitList.push({
                        _skill: skill._id,
                        _human: human._id
                    })
                }
            })
        })

        window.data = {
            // 'ac'>'ab'
            humanList: humanList.sort((a, b) => a._id > b._id),
            skillList,
            unitList,
        };
        window.focus = {
            human: data.humanList[0] || '',
            role: (data.humanList[0] || {})._role || '',
            skill: data.skillList[0] || '',
            type: (data.skillList[0] || {})._type || '',
            unit: data.unitList[0] || '',

            node: null,
            column: null,
        };
        window.cfg = cfg;
     
        
        initAggrid();
        init4addButtonsInDrawer();
        repaint();
        Object.assign(dom.MDCSnackbar, {
            labelText: `LOGIN OK`,
            timeoutMs: 4000,
            actionButtonText: ''
        }).open();


        // 执行初始化脚本
        const cmd = localStorage.getItem('debug');
        if (cmd) {
            eval(cmd);
            Object.assign(dom.MDCSnackbar, {
                labelText: `【DEBUG】${cmd}`,
                timeoutMs: 4000,
                actionButtonText: ''
            }).open();
        };

        await new Promise(res => setTimeout(res, 1))

        gridOptions.columnApi.autoSizeAllColumns();

        // console.clear();
    } catch (err) {
        alert(err.message || err)
    };
}

// onclick
function login() {
    if (window.user) {
        Object.assign(dom.MDCSnackbar, {
            labelText: `U have already login`,
            timeoutMs: 4000,
            actionButtonText: ''
        }).open();
        return;
    }

    openLoginEditor().then(user => {
        user._id = user._id.trim();
        if (user._id && user._pwd) return curd.login(user);
        else throw new Error('Username or Password is Blank');
    }).then(user => {
        dom.progress.classList.remove('mdc-linear-progress--closed');
        location.reload();
    }).catch(err => alert(err.message));
}

function init4addButtonsInDrawer() {

    // drawer里add object里4个按钮的监听事件

    // add role
    document.querySelector('.mdc-menu [data-obj="role"]').addEventListener('click', event => {
        if (user._lv !== 'root') {
            alert(`Call ${cfg.app.admin} to create a Role for you`);
            return;
        }
        let newRole = prompt('Enter new Role(group of persons) Name : \n (If possible, using existing roles is better)');
        if (typeof newRole === 'string') newRole = newRole.trim();
        if (newRole) {
            if (user._roleList.includes(newRole)) {
                alert(`【${newRole}】 already included`);
                return;
            }
            curd.setHuman({
                _id: user._id,
                _roleList: [...user._roleList, newRole]
            }).then(human => {

                user._roleList.push(newRole);
                // roleListAll.push(_id);
                Object.assign(dom.MDCSnackbar, {
                    labelText: `OK, ${newRole} included.`,
                    timeoutMs: 4000,
                    actionButtonText: ''
                }).open();
                return curd.login({});
            }).catch(err => alert(err.message));
        }
    });

    // add human
    document.querySelector('.mdc-menu [data-obj="human"]').addEventListener('click', event => {
        openHumanEditor({
            human: {
                _id: 'somebody@gmail.com',
                _role: focus.role || focus.human._role || 'unset',
                _info: focus.human._info || window.user._info || '',
                _lv: 'human'
            },
            title: '<i class="material-icons">add</i> Add a Person',
            required: ['_role'],
            disabledFields: ['root._lv']
        }).then(newUser => curd.addHuman(newUser))
            .then(human => {
                data.humanList.push(human);
                repaint();
                Object.assign(dom.MDCSnackbar, {
                    labelText: `Added. ${human._id}`,
                    timeoutMs: 4000,
                    actionButtonText: ''
                }).open();
            }).catch(err => alert(err.message));
    });

    // add type
    document.querySelector('.mdc-menu [data-obj="type"]').addEventListener('click', event => {
        if (user._lv !== 'root') {
            alert(`Call ${cfg.app.admin} to create a Skill-Type for you`);
            return;
        }
        let _id = prompt("New Type(group of skills) Name : \n (If possible, using existing types is better)");
        if (_id) {
            if (user._typeList.includes(_id)) {
                alert(`${_id} already included`);
                return;
            }
            curd.setHuman({
                _id: user._id,
                _typeList: [...user._typeList, _id]
            }).then(() => {
                user._typeList.push(_id);
                // typeListAll.push(_id);
                Object.assign(dom.MDCSnackbar, {
                    labelText: `OK, ${_id} included.`,
                    timeoutMs: 4000,
                    actionButtonText: ''
                }).open();
                return curd.login({});
            }).catch(err => alert(err.message));
        }
    });

    // add skill
    document.querySelector('.mdc-menu [data-obj="skill"]').addEventListener('click', event => {
        openSkillEditor({
            skill: {
                _id: '',
                _type: focus.skill._type || user._typeList[0],
                _sub_type: focus.skill._sub_type || '',
                _info: ''
            },
            title: '<i class="material-icons">add</i> Add a Skill',
            disabledFields: [],
            required: ['_type']
        }).then(newSkill => curd.addSkill(newSkill))
            .then(skill => {
                data.skillList.push(skill);
                repaint();
                Object.assign(dom.MDCSnackbar, {
                    labelText: `Added. ${skill._id}`,
                    timeoutMs: 5000,
                    actionButtonText: ''
                }).open();
            }).catch(err => alert(err.message));
    });


}


function initAggrid() {
    agGrid.LicenseManager.setLicenseKey("your license key");

    window.gridOptions = {
        sideBar: {
            toolPanels: [
                {
                    id: 'columns',
                    labelDefault: 'Columns',
                    labelKey: 'columns',
                    iconKey: 'columns',
                    toolPanel: 'agColumnsToolPanel',
                }, {
                    id: 'filters',
                    labelDefault: 'Filters',
                    labelKey: 'filters',
                    iconKey: 'filter',
                    toolPanel: 'agFiltersToolPanel',
                }, {
                    id: 'tools',
                    labelDefault: 'Tools',
                    labelKey: 'tools',
                    iconKey: 'my-scissor',
                    toolPanel: 'customToolPanel',
                }
            ],
            defaultToolPanel: 'tools'
        },
        components: {
            customToolPanel: class {
                constructor() { }

                init(params) {
                    this.eGui = document.importNode(document.querySelector('template').content, true);
                    // calculate stats when new rows loaded, i.e. onModelUpdated
                    // 可以是this.eGui.innerHTML = ...
                    params.api.addEventListener('modelUpdated', () => { });
                }

                getGui() {
                    return this.eGui;
                }
            }
        },
        icons: {
            'my-scissor': '<span class="ag-icon ag-icon-cut"></span>'
        },
        columnDefs: [],
        rowData: [],
        animateRows: true,
        enableRangeHandle: true,
        editType: 'fullRow',
        getContextMenuItems,
        enableCharts: true,
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
        autoGroupColumnDef: {
            // headerName: "Group",
            width: 250,
            cellRenderer: 'agGroupCellRenderer',
        },
        getRowStyle(params) {
            if (params.node.group) return {
                'backgroundColor': '#ebebeb',
                'fontSize': '14px'
            }
            else return {
                'fontSize': '14px'
            };

        },
        // getRowClass: params => {
        // },
        onCellClicked: event => {
            // 方便debug
            console.log(event);
        },
        // 空白区域右击不触发
        onCellContextMenu: event => {
            // 都写在getContextMenuItems里
        },
        // 编辑框出现的时候：focusing
        onCellEditingStarted: event => {
            n = event.node;
            focus.node = n;
            focus.human = data.humanList.find(h => h._id === n.data._human) || '';
            focus.role = n.data._role || '';
            focus.skill = data.skillList.find(s => s._id === n.data._skill) || '';
            focus.type = n.data._type || '';
            focus.unit = data.unitList.find(u => u._human === focus.human._id && u._skill === focus.skill._id) || '';
        },
        // 编辑器关闭那一刻
        onCellEditingStopped: event => { },
        // 按esc退出编辑(不触发)
        async onRowValueChanged(event) {
            try {
                if (event.node.group) return;
                // const h = data.humanList.find(h => h._id === event.data._human);
                // const s = data.skillList.find(s => s._id === event.data._skill);
                if (!focus.human) throw new Error(`Cannot find person 【${event.data._human || '_unknown person'}】`)
                if (!focus.skill) throw new Error(`Cannot find skill 【${event.data._skill || '_unknown skill'}】`)

                const unitKeys = Object.keys(event.data).filter(key => key[0] !== '_');

                // 对那一行格式化
                unitKeys.forEach(k => {
                    if ((typeof event.data[k]) === 'string') event.data[k] = event.data[k].trim();
                    if ([undefined, null, NaN, ''].includes(event.data[k])) event.data[k] = undefined;
                });


                if (!focus.unit) throw 'cannot find this row!'

                // 新旧unit对闭
                // focus.unit: old unit
                // event.data: new unit
                if (['aim', 'score', 'act', 'status', 'detail', 'extra'].every(k => focus.unit[k] === event.data[k])) return;


                // 待发送的unit
                const unit = {
                    _human: focus.human._id,
                    _skill: focus.skill._id,
                }

                if (unitKeys.some(k => event.data[k] !== undefined)) {


                    Object.assign(unit, unitKeys.filter(k => event.data[k] !== undefined).reduce((unit, key) => {
                        unit[key] = event.data[key];
                        return unit;
                    }, {}));
                    // JSON.stringify会把undefined过滤掉
                    const returnUnit = await curd.replaceUnit(unit)

                    data.unitList[data.unitList.indexOf(focus.unit)] = returnUnit;
                } else {
                    // replace还是drop由前端来判断
                    // deadUnit是drop之前的遗像，可能有其他属性
                    const deadUnit = await curd.dropUnit(unit);
                    // data.unitList.splice(data.unitList.indexOf(focus.unit), 1)
                    data.unitList[data.unitList.indexOf(focus.unit)] = unit;
                }


                Object.assign(dom.MDCSnackbar, {
                    labelText: `updated.`,
                    timeoutMs: 4000,
                    actionButtonText: ''
                }).open();

            } catch (err) {
                alert(err.message || err)
            }





        },
        statusBar: {
            statusPanels: [{
                statusPanel: 'agTotalRowCountComponent',
                align: 'left'
            }, {
                statusPanel: 'agTotalAndFilteredRowCountComponent',
                align: 'left'
            }, {
                statusPanel: 'agFilteredRowCountComponent'
            }, {
                statusPanel: 'agSelectedRowCountComponent'
            }, {
                statusPanel: 'agAggregationComponent'
            }]
        },
        aggFuncs: {
            // this may overrides the grids built in sum function(if name collide)
            SUM(values) { return +values.reduce((sum, current) => typeof current === 'number' ? sum + current : sum, 0).toFixed(1) },
            AVG(values) { return +values.filter(v => typeof v === 'number').reduce((sum, current, i, src) => sum + current / src.length, 0).toFixed(1) },
            // never used
            Random(values) { return values[~~(Math.random() * values.length)] }
        },
    }

    // 提前生成好
    new agGrid.Grid(document.querySelector('#grid'), window.gridOptions);





    // 可编辑字段的样式
    const cellStyle = {
        color: '#ff5690'
    };

    // 6个可编辑字段
    const unitColumns = [{
        editable: true,
        cellStyle,
        headerName: 'My Target',
        field: 'aim',
        colId: 'aim',
        // cellEditor: 'numericCellEditor',
        // 编辑完都是string
        enableValue: true,
        type: "numericColumn",
        aggFunc: 'AVG',
        valueParser: params => {
            const newNum = +(params.newValue.trim() || NaN);
            return newNum === 0 ? 0 : (newNum || undefined);
        },
        chartDataType: 'series'

    }, {
        cellStyle,
        headerName: 'My Score',
        field: 'score',
        editable: true,
        enableValue: true,
        type: "numericColumn",
        aggFunc: 'AVG',
        valueParser: params => {
            const newNum = +(params.newValue.trim() || NaN);
            return newNum === 0 ? 0 : (newNum || undefined);
        },
        chartDataType: 'series'

    }, {
        cellStyle,
        headerName: 'Action',
        editable: true,
        field: 'act',
        colId: 'act',
        valueParser: params => params.newValue.trim() || undefined,
    }, {
        cellStyle,
        headerName: 'Action Status',
        field: 'status',
        colId: 'status',
        editable: true,
        // cellEditorSelector: () => ({
        //     component: 'agRichSelectCellEditor',
        //     params: {
        //         values: ['',open', 'planned', 'ongoing', 'closed']
        //     }
        // })
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
            values: ['', 'open', 'planned', 'ongoing', 'closed']
        },
        // bug: not called
        valueParser: params => params.newValue.trim() || undefined,
    }, {
        cellStyle,
        headerName: 'Action Detail',
        field: 'detail',
        editable: true,
        colId: 'detail',
        valueParser: params => params.newValue.trim() || undefined,
    }, {
        cellStyle,
        headerName: 'Comment',
        field: 'extra',
        editable: true,
        colId: 'extra',
        valueParser: params => params.newValue.trim() || undefined,
        // cellEditor:'agLargeTextCellEditor'
    }];



    const columnDefs = [{
        headerName: 'Person',
        field: '_human',
        rowGroup: true,
        hide: true,
        rowDrag: true,
    }, {
        headerName: 'Role',
        field: '_role',
        aggFunc: 'first'
    }, {
        headerName: 'About',
        field: '_info',
        hide: true,
    }, {
        headerName: 'Skill',
        field: '_skill',
        sort: 'asc',
    }, {
        headerName: 'Skill-Type',
        field: '_type',
        colId: '_type',
    }, {
        headerName: 'Skill-SubType',
        field: '_sub_type',
        colId: '_sub_type',
        hide: true
    }, {
        cellStyle: {
            'color': 'teal'
        },
        headerName: 'Role Target',
        field: '_role_aim',
        enableValue: true,
        // group后自动aggregate
        aggFunc: 'AVG',
        type: "numericColumn",
        chartDataType: 'series'

    }];

    columnDefs.push(...unitColumns);



    // 覆盖原来的
    gridOptions.api.setColumnDefs(columnDefs);
}


// 定义rowData
// initialize
function repaint() {

    // gridOptions.api.setRowData([]);
    const rowData = [];

    data.humanList.forEach(human => {
        let rowCount4human = 0;
        data.skillList.forEach(skill => {
            const unit = data.unitList.find(unit => unit._human === human._id && unit._skill === skill._id);
            // 如果不存在这条unit数据（行），可能本身DB里就没有这个unit，或者typelist没有强制纳入它。
            if (!unit) return;

            const row = {
                _human: human._id,
                _role: human._role,
                _info: human._info,
                _skill: skill._id,
                _type: skill._type,
                _sub_type: skill._sub_type,
                _role_aim: skill[human._role],
            };

            Object.keys(unit).forEach(k => {
                if (k[0] === '_') return;
                if (typeof unit[k] === 'string') unit[k] = unit[k].trim();
                if ([undefined, null, ''].includes(unit[k])) delete unit[k];
            });
            Object.assign(row, unit);

            rowData.push(row);
            rowCount4human++;
        });

        // 如果这个human没有行，展示一个占位符
        if (rowCount4human === 0) {
            rowData.push({
                _human: human._id,
                _role: human._role,
                _info: human._info,
            })
        }
    });

    // 添加剩下的role组成空row, 保持完整性
    window.user._roleList.forEach(r => {
        if (rowData.some(row => row._role === r)) return;
        else rowData.push({
            _human: '_nobody',
            _role: r
        })
    })

    // 覆盖
    gridOptions.api.setRowData(rowData);
    gridOptions.api.expandAll();
}


// context menu
// 点击右键时call的回调 ==> 可以作为简单的mvvm使用
function getContextMenuItems(event) {
    // focusing
    const n = event.node;
    if (n && event.column) {
        focus.node = n;
        focus.column = event.column;
        if (n.group) {
            focus.human = data.humanList.find(h => h._id === n.key || h._id === n.aggData._human) || '';
            focus.role = n.aggData._role || '';
            focus.skill = data.skillList.find(s => s._id === n.key || s._id === n.aggData._skill) || '';
            focus.type = n.aggData._type || '';
        } else {
            focus.human = data.humanList.find(h => h._id === n.data._human) || '';
            focus.role = n.data._role || '';
            focus.skill = data.skillList.find(s => s._id === n.data._skill) || '';
            focus.type = n.data._type || '';
            focus.unit = data.unitList.find(u => u._human === n.data._human && u._skill === n.data._skill) || '';
        }
    } else return null;



    let menu_drop = {
        name: 'Remove',
        icon: '<i class="material-icons">remove</i>',
        subMenu: [{
            name: `Person 【${focus.human ? focus.human._id : 'nobody'}】`,
            icon: '<i class="material-icons">arrow_right</i>',
            async action() {
                try {
                    if (!focus.human) throw 'no specific person';

                    // if (focus.human._pwd) throw new Error(`Sorry, ${focus.human._id} is a registered user`);
                    let _id = prompt(`Enter '${focus.human._id}' to confirm deletion:`);
                    if (!_id) return;
                    if (_id !== focus.human._id) throw new Error('not match!');

                    const human = await curd.dropHuman({
                        _id
                    });


                    data.humanList.splice(data.humanList.indexOf(data.humanList.find(h => h._id === human._id)), 1);
                    repaint();
                    Object.assign(dom.MDCSnackbar, {
                        labelText: `Dropped. ${human._id}`,
                        timeoutMs: 4000,
                        actionButtonText: ''
                    }).open();

                } catch (err) {


                    alert(err.message || err);
                }
            }
        }, {
            name: `Skill 【${focus.skill ? focus.skill._id : 'blank'}】`,
            disabled: focus.skill ? false : true,
            icon: '<i class="material-icons">arrow_right</i>',
            async  action() {
                try {
                    if (!focus.skill) throw 'no Skill found in this line'

                    let name = prompt(`Caution, this may affect many people who have data on this skill. Enter '${focus.skill._id}' to confirm deletion:`);
                    if (!name) return;
                    if (name !== focus.skill._id) { alert('not match!'); return };
                    const skill = await curd.dropSkill({
                        _id: focus.skill._id
                    })


                    data.skillList.splice(data.skillList.indexOf(data.skillList.find(s => s._id === skill._id)), 1);
                    repaint();
                    Object.assign(dom.MDCSnackbar, {
                        labelText: `Dropped. ${skill._id}`,
                        timeoutMs: 4000,
                        actionButtonText: ''
                    }).open();

                } catch (err) {

                    alert(err.message || err);
                }
            }
        },

        ]
    };

    const menu_set = {
        name: `Update`,
        icon: '<i class="material-icons">create</i>',
        subMenu: [{
            name: `Person 【${focus.human ? focus.human._id : 'nobody'}】`,
            icon: '<i class="material-icons">arrow_right</i>',
            async action() {
                try {
                    if (!focus.human) throw 'no specific person'

                    const updatedUser = await openHumanEditor({
                        human: {
                            _id: focus.human._id,
                            _info: focus.human._info || '',
                            _role: focus.human._role,
                            _lv: focus.human._lv,
                        },
                        title: `<i class="material-icons">settings</i> ${focus.human._id}`,
                        disabledFields: ['root._id', 'root._lv'],
                        required: ['_role']
                    })

                    const user = await curd.setHuman(updatedUser);


                    Object.assign(dom.MDCSnackbar, {
                        labelText: `Updated.`,
                        timeoutMs: 4000,
                        actionButtonText: ''
                    }).open();

                    Object.assign(data.humanList.find(h => h._id === user._id), user);


                    repaint();

                } catch (err) {

                    alert(err.message || err);
                }
            }
        }, {
            name: `Skill 【${focus.skill ? focus.skill._id : 'blank'}】`,
            disabled: focus.skill ? false : true,
            icon: '<i class="material-icons">arrow_right</i>',
            async  action() {
                try {
                    if (!focus.skill) throw 'no Skill found in this line'

                    const updatedSkill = await openSkillEditor({
                        skill: {
                            _id: focus.skill._id,
                            _type: focus.skill._type,
                            _sub_type: focus.skill._sub_type || '',
                            _info: focus.skill._info || ''
                        },
                        title: `<i class="material-icons">settings</i> ${focus.skill._id}`,
                        disabledFields: ['root._id'],
                        required: ['_type']
                    })
                    const skill = await curd.setSkill(updatedSkill);

                    Object.assign(dom.MDCSnackbar, {
                        labelText: `Updated.`,
                        timeoutMs: 4000,
                        actionButtonText: ''
                    }).open();

                    Object.assign(data.skillList.find(s => s._id === skill._id), skill);
                    repaint();

                } catch (err) {
                    alert(err.message || err);
                }
            }
        }, {
            name: `Role Target${(focus.role && focus.skill) ? '' : '【blank】'}`,
            disabled: (focus.role && focus.skill) ? false : true,
            icon: '<i class="material-icons">arrow_right</i>',
            async action() {
                try {
                    if (!focus.role) throw 'no Role found in this line'
                    if (!focus.skill) throw 'no Skill found in this line'
                    // if (!focus.role || !focus.skill) return;
                    // 当前请求任务的闭包skill和role
                    const skill = {
                        _id: focus.skill._id
                    }
                    const role = focus.role;

                    const oldRoleAim = focus.skill[focus.role];

                    let newAim = prompt(`new target of ${role} on ${skill._id}`, focus.skill[role] || 'blank');
                    if (newAim === null) return;
                    newAim = +(newAim.trim() || NaN);

                    if (oldRoleAim === newAim) return;

                    skill[role] = newAim === 0 ? 0 : (newAim || null);



                    const returnSkill = await curd.setSkill(skill);

                    data.skillList.find(s => s._id === skill._id)[role] = returnSkill[role] || undefined;

                    gridOptions.api.forEachLeafNode(node => {
                        if (node.data._role === role && node.data._skill === skill._id) {
                            node.setDataValue('_role_aim', returnSkill[role]);
                        }
                    });

                    Object.assign(dom.MDCSnackbar, {
                        labelText: `Updated.`,
                        timeoutMs: 4000,
                        actionButtonText: ''
                    }).open();


                } catch (err) {
                    alert(err.message || err)
                }


            }
        }]
    };


    const menu_chart = {
        name: 'Radar Chart',
        icon: '<i class="material-icons">donut_large</i>',
        subMenu: [{
            name: 'Person on Skills',
            icon: '<i class="material-icons">arrow_right</i>',
            action: () => {
                drawRadar({
                    service: 'person_skill'
                });
            }
        }, {
            name: 'Role on Skills',
            icon: '<i class="material-icons">arrow_right</i>',
            action: () => {
                drawRadar({
                    service: 'role_skill'
                });
            }
        }, {
            name: 'Person on Skill-Types',
            icon: '<i class="material-icons">arrow_right</i>',
            action: () => {
                drawRadar({
                    service: 'person_type'
                });
            }
        }, {
            name: 'Role on Skill-Types',
            icon: '<i class="material-icons">arrow_right</i>',
            action: () => {
                drawRadar({
                    service: 'role_type'
                });
            }
        }]
    };


    const menu_repaint = {
        name: 'Repaint',
        icon: '<i class="material-icons">refresh</i>',
        action: repaint
    };






    const menu_transform = {
        name: 'Transform',
        icon: '<i class="material-icons">transform</i>',
        subMenu: [
            'contractAll',
            'expandAll',
            'autoSizeAll',
            'separator',
            'resetColumns',
            {
                name: `Group(only) by ${event.column.colDef.headerName}`,
                action: () => {
                    let col = gridOptions.columnApi.getColumn(event.column.colDef.field);
                    gridOptions.columnApi.setRowGroupColumns([col]);
                    gridOptions.api.expandAll();
                    gridOptions.columnApi.autoSizeAllColumns();
                }
            }, {
                name: 'Ungroup All',
                action: () => {
                    gridOptions.columnApi.setRowGroupColumns([]);
                }
            },
        ]
    }

    return [
        menu_set,
        menu_drop,
        'separator',
        'chartRange',
        menu_chart,
        'separator',
        menu_transform,
        {
            name: 'Hide This Column',
            icon: '<i class="material-icons">minimize</i>',
            action() {
                gridOptions.columnApi.setColumnVisible(focus.column.colId, false);
            }
        },
        menu_repaint,
        'export',
        // ...event.defaultItems ,
    ];
}


// onclick
function debug_remote() {
    if (!user || user._lv !== 'root') {
        alert('Permission denied, root user only');
        return;
    }
    // 使用原生的挺好
    const input = prompt('Caution! Execution from source code is extremely dangerous!');
    if (!input) return;
    curd.debug(input).then(output => {
        alert(JSON.stringify(output, null, '\t'));
        console.log(output);
    }).catch(err => alert(err.message));
}

// onclick
function debug_local() {
    let cmd = prompt('Overwrite current command:', localStorage.getItem('debug') || '');
    if (cmd !== null) {
        if (cmd.trim() === '') localStorage.removeItem('debug');
        else localStorage.setItem('debug', cmd);
        if (confirm('Command updated, reload?'))
            location.reload();
    }
}


// onclick
function log() {
    curd.log().then(list => {
        Object.assign(dom.MDCSnackbar, {
            labelText: `Recent ${list.length} logs printed in the Console`,
            timeoutMs: 4000,
            actionButtonText: ''
        }).open();
        list = list.sort((a, b) => a._id - b._id).map(log => Object.assign(log, {
            _id: new Date(log._id).toString()
        }))
        console.table(list);
    }).catch(err => alert(err.message || err));
}


// 默认参数在函数执行的时候赋值
async function drawRadar({
    // 雷达segment条边
    segment = cfg.radar.segment,
    service = 'person_skill',
    max = cfg.radar.max
}) {
    await new Promise((resolve, reject) => {
        if (dom.MDCDrawer.open) {
            dom.MDCDrawer.open = false;
            setTimeout(resolve, 400);
        } else resolve();
    });

    // 封装data: {label, aim, score, _role_aim}
    let dataList = [];
    const dataListList = [];


    ({
        'person_skill': () => {
            document.querySelector('#radar .mdc-dialog__title').innerHTML = `<i class="material-icons">pie_chart</i> ${focus.human._id} & Skills`;
            gridOptions.columnApi.setRowGroupColumns([gridOptions.columnApi.getColumn("_human")]);
            gridOptions.api.forEachNodeAfterFilterAndSort(node => {
                if (!node.group && node.data._human === focus.human._id) dataList.push(Object.assign({}, node.data, {
                    label: node.data._skill
                }));
            });
        },
        'person_type': () => {
            document.querySelector('#radar .mdc-dialog__title').innerHTML = `<i class="material-icons">pie_chart</i> ${focus.human._id} & Skill-Types`;
            gridOptions.columnApi.setRowGroupColumns([gridOptions.columnApi.getColumn("_human"), gridOptions.columnApi.getColumn("_type")]);
            let found = false;
            gridOptions.api.forEachNodeAfterFilterAndSort(node => {
                if (found) return;
                if (node.group && node.field === '_human' && node.key === focus.human._id) {
                    found = true;
                    dataList = node.childrenAfterGroup.map(n => Object.assign({}, n.aggData, {
                        label: n.key
                    }));
                };
            });
        },
        'role_skill': () => {
            document.querySelector('#radar .mdc-dialog__title').innerHTML = `<i class="material-icons">pie_chart</i> ${focus.role} & Skills`;
            // 先强制二级group
            gridOptions.columnApi.setRowGroupColumns([gridOptions.columnApi.getColumn("_role"), gridOptions.columnApi.getColumn("_skill")]);
            gridOptions.api.forEachNodeAfterFilterAndSort(node => {
                if (node.group && node.field === '_skill' && node.aggData._role === focus.role) {
                    dataList.push({
                        aim: node.aggData.aim,
                        score: node.aggData.score,
                        _role_aim: node.aggData._role_aim,
                        label: node.key
                    });
                };
            });
        },
        'role_type': () => {
            document.querySelector('#radar .mdc-dialog__title').innerHTML = `<i class="material-icons">pie_chart</i> ${focus.role} & Skill-Types`;
            // 先强制二级group
            gridOptions.columnApi.setRowGroupColumns([gridOptions.columnApi.getColumn("_role"), gridOptions.columnApi.getColumn("_type")]);
            // 找到那个顶级node
            let found = false;
            gridOptions.api.forEachNodeAfterFilterAndSort(node => {
                if (found) return;
                if (node.group && node.field === '_role' && node.key === focus.role) {
                    found = true;
                    dataList = node.childrenAfterGroup.map(n => Object.assign({}, n.aggData, {
                        label: n.key
                    }));
                };
            });
        }
    })[service]();


    Array.from({
        length: Math.floor(dataList.length / segment)
    }).forEach((none, i) => {
        dataListList.push(dataList.slice(i * segment, i * segment + segment));
    });

    // 决定最后一个radar是否合并到倒数第二个radar
    const last = dataList.length % segment;
    const lastList = dataList.slice(dataList.length - last, dataList.length);
    if (last >= 3 || dataListList.length === 0) dataListList.push(lastList);
    else dataListList[dataListList.length - 1].push(...lastList);

    dom.radar.open();
    const radarFrame = document.createElement('section');
    const radarFrameParent = document.querySelector('#radar .mdc-dialog__content');
    radarFrameParent.innerHTML = '';
    radarFrameParent.appendChild(radarFrame);

    dataListList.map(dataList => ({
        labels: dataList.map(data => data.label),
        datasets: [{
            label: 'Max',
            data: new Array(dataList.length).fill(max),
            borderColor: 'black',
            backgroundColor: 'transparent',
            borderWidth: 1
        }, {
            label: 'Role Target',
            data: dataList.map(data => data._role_aim),
            borderColor: "rgba(0,0,255,1)",
            backgroundColor: 'rgba(0,0,255,0.4)',
            borderWidth: 2,
        }, {
            label: 'My Target',
            data: dataList.map(data => data.aim),
            borderColor: "rgba(0,255,0,1)",
            backgroundColor: 'rgba(0,255,0,0.4)',
            borderWidth: 2,
        }, {
            label: 'My Score',
            data: dataList.map(data => data.score),
            borderColor: "rgba(255,0,0,1)",
            backgroundColor: 'rgba(255,0,0,0.4)',
            borderWidth: 2,
        }]

    })).forEach(radar => {
        let container = document.createElement('canvas');
        radarFrame.appendChild(container);
        new Chart(container.getContext('2d'), {
            type: 'radar',
            data: {
                labels: radar.labels,
                datasets: radar.datasets.reverse()
            },
            options: {
                scale: {
                    ticks: {
                        beginAtZero: true,
                    }
                },
                elements: {},
                showLines: true,
                title: {
                    display: false,
                },
            }
        });
    });
}


function createRangeChart({
    cellRange = {
        columns: ["ag-Grid-AutoColumn", '_role_aim', 'aim', 'score']
    },
    chartType = 'stackedBar',
    chartContainer,
    suppressChartRanges,
    aggregate,
    processChartOptions
}) {
    gridOptions.api.createRangeChart({
        cellRange,
        chartType,
        chartContainer,
        suppressChartRanges,
        aggregate,
        processChartOptions,
    });
}