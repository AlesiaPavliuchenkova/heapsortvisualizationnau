const MAX_COUNT = 15;
const MIN_VALUE = 0;
const MAX_VALUE = 100;
const ASCENDING_ORDER = 'ascending';
const LESS = 'less';
const MORE = 'more';
const PAUSE = 'PAUSE';
let elementsCount = 0;
let network;
let arrNodes = [];
let arrEdges = [];
let arrForEdges = [];
let timeMs;
let isPaused = false;
let isStopped = false;

document.getElementById('continue').onclick = continueExec;
document.getElementById('play').onclick = play;
document.getElementById('generate-values').onclick = generateValues;
document.getElementById('pause').onclick = pause;
document.getElementById('stop').onclick = stop;

function continueExec() {
    elementsCount = document.getElementById('elements-count').value;
    if (elementsCount <= 0 || elementsCount > MAX_COUNT) {
        stopContinue();
        return;
    }
    continueVisualization();
}

async function play() {
    try {
        isStopped = false;
        hideVisualizationBlock();
        disableElement('continue', true);
        disableElement('play', true);
        disableElement('generate-values', true);
        let order = document.getElementById('order').value;
        timeMs = document.getElementById('speed').value;
        for(let i = 0; i < elementsCount; i++) {
            let val = document.getElementById(`element${i}`).value;
            if (checkValueFailed(val)) {
                disableElement('continue', false);
                disableElement('play', false);
                disableElement('generate-values', false);
                return;
            }
            arrNodes.push({id: i+1, label: val});
            if(i!=0) arrForEdges.unshift(i+1);
        }
        arrNodes.forEach(node => disableElement(`element${node.id-1}`, true));
        let i = 1;
        while(arrForEdges.length != 0) {
            for(let j = 0; j < 2; j++) {
                if (arrForEdges.length == 0) break;
                arrEdges.push({from: i, to: arrForEdges.pop(), length: 40});
            }
            i++;
        }
        let nodes = new vis.DataSet(arrNodes);
        let edges = new vis.DataSet(arrEdges);
        await setText1Value(order);
        await visualizeTree(nodes, edges);

        disableElement('pause', false);
        disableElement('stop', false);

        await sort(nodes, order);

        disableElement('continue', false);
        disableElement('play', false);
        disableElement('generate-values', false);
        disableElement('pause', true);
        disableElement('stop', true);
        clearTimeout();
    } catch (ex) {
        console.log(ex);
        clearTimeout();
        return;
    }
}

function generateValues() {
    for(let i = 0; i < elementsCount; i++) {
        document.getElementById(`element${i}`).value = Math.floor(Math.random() * MAX_VALUE) + MIN_VALUE;
        document.getElementById(`element${i}`).style = 'color:black;font-weight:normal;';
    }
}

function pause() {
    let pause = document.getElementById('pause');
    if (pause.innerHTML === PAUSE) {
        pause.innerHTML = 'RESUME';
        isPaused = true;
    } else {
        pause.innerHTML = PAUSE;
        isPaused = false;
    }
}

function stop() {
    disableElement('continue', false);
    disableElement('play', false);
    disableElement('generate-values', false);
    disableElement('pause', true);
    disableElement('stop', true);
    isStopped = true;
    clearTimeout();
    hideVisualizationBlock();
}

async function sort(nodes, order){
    if (isPaused) await delay();  
    let text1 = document.getElementById('text1');
    let text2 = document.getElementById('text2');
    let n = arrNodes.length;
 
    text2.innerHTML = '';
    text2.innerHTML = `Start comparison from floor ${n}/2 = ${Math.floor(n/2)} (index = ${Math.floor(n/2) - 1}).`;
    if (isPaused) await delay();
    await sleep(timeMs);
    //build min/max heap
    for(let i = Math.floor(n/2) - 1; i >= 0; i--) {
        await (order === ASCENDING_ORDER ? 
                maxHeapify(n, i, nodes) : 
                minHeapify(n, i, nodes));
    }
    
    if (isPaused) await delay();
    //start ordering and rebuilding heap after node deletion
    for(let j = n - 1; j > 0; j-- ) {
        text2.innerHTML = '';
        await sleep(1000);
        text2.innerHTML = 'Heap building has been finished.';
        await sleep(timeMs * 2);
        await swap(0, j, true, null, nodes);
        await (order === ASCENDING_ORDER ? 
                maxHeapify(j, 0, nodes) : 
                minHeapify(j, 0, nodes));
    }
    //hide last node
    await hideNode(0, nodes);
    text1.innerHTML = '';
    text2.innerHTML = 'Algorithm visualization is comleted.'
}

async function swap(firstIndex, lastIndex, isDeleted, info, nodes) {
    if (isPaused) await delay();  
    let text2 = document.getElementById('text2');
    let text3 = document.getElementById('text3');
    
    if (isDeleted) {
        if (isPaused) await delay();
        text2.innerHTML = '';
        await sleep(500);
        text2.innerHTML = `Swap first (${firstIndex}) and last (${lastIndex}) elements.`;
        await highlightNode(firstIndex, nodes);
        await highlightNode(lastIndex, nodes);
        await sleep(timeMs);
    } else {
        //highlight changed info for child in table and tree
        await highlighInfoChild(firstIndex, lastIndex, info, nodes);
    }

    let temp = arrNodes[firstIndex];
    arrNodes[firstIndex] = arrNodes[lastIndex];
    arrNodes[lastIndex] = temp;

    //change vision for table and tree
    await switchNodes(firstIndex, lastIndex, nodes);
    await sleep(timeMs);
    //dehighlight info
    await dehighlightInfo(firstIndex, lastIndex, nodes);
    //hide deleted node
    if (isDeleted) {
        await highlightNode(lastIndex, nodes);
        if (isPaused) await delay();
        text3.innerHTML = '';
        await sleep(500);
        text3.innerHTML = `Delete ${lastIndex} element and rebuild heap starting from ${firstIndex} position.`;
        await sleep(timeMs);
        await hideNode(lastIndex, nodes); 
    }
}
    
async function maxHeapify(n, i, nodes) {
    if (isPaused) await delay();  
    let max = i;
    let leftId = 2*i+1;
    let rightId = 2*i+2;
    let isChanged = false;
    let childCount = 0;
        
    Number(leftId) < Number(n) ? childCount++ : childCount;
    Number(rightId) < Number(n) ? childCount++ : childCount;
    
    if(leftId < n && Number(arrNodes[leftId].label) > Number(arrNodes[max].label)) {
        max = leftId;
        isChanged = true;
    }
    
    if(rightId < n && Number(arrNodes[rightId].label) > Number(arrNodes[max].label)) {
        max = rightId;
        isChanged = true;
    }
    await highlightInfo(i, MORE, isChanged, childCount, nodes);
    if (!isChanged)  await dehighlightInfo(i, i, nodes);
    
    if(max != i) {
        await swap(i, max, false, MORE, nodes);
        await maxHeapify(n, max, nodes);
    }
}

async function minHeapify(n, i, nodes) {
    if (isPaused) await delay();  
    let min = i;
    let leftId = 2*i+1;
    let rightId = 2*i+2;
    let isChanged = false;
    let childCount = 0;
    
    Number(leftId) < Number(n) ? childCount++ : childCount;
    Number(rightId) < Number(n) ? childCount++ : childCount;
    
    if(leftId < n && Number(arrNodes[leftId].label) < Number(arrNodes[min].label)) {
        min = leftId;
        isChanged = true;
    }
    
    if(rightId < n && Number(arrNodes[rightId].label) < Number(arrNodes[min].label)) {
        min = rightId;
        isChanged = true;
    }
    
    await highlightInfo(i, LESS, isChanged, childCount, nodes);
    if (!isChanged)  await dehighlightInfo(i, i, nodes);
    
    if(min != i) {
        await swap(i, min, false, LESS, nodes);
        await minHeapify(n, min, nodes);
    }
}

async function switchNodes(firstIndex, lastIndex, nodes) {
    if (isPaused) await delay();
    await sleep(timeMs);
    //switch nodes in table
    document.getElementById(`element${firstIndex}`).value = arrNodes[firstIndex].label;
    document.getElementById(`element${lastIndex}`).value = arrNodes[lastIndex].label;
    //switch nodes in tree
    nodes.update([{id: firstIndex+1, label: arrNodes[firstIndex].label}]);
    nodes.update([{id: lastIndex+1, label: arrNodes[lastIndex].label}]);
}

function checkValueFailed(val) {
    if(Number(val) < Number(MIN_VALUE) || Number(val) > Number(MAX_VALUE) || val.length == 0) {
        document.getElementById('array-elements-value-hint').innerHTML = `Values can be in range ${MIN_VALUE} - ${MAX_VALUE}(included) and should be defined`;
        document.getElementById('array-elements-value-hint').style = 'color:red';       
        return true;
    }
    return false;
}

function setText1Value(order) {
    let text1 = document.getElementById('text1');
    order == ASCENDING_ORDER ? 
        text1.innerHTML = 'Build Max Heap. Each Parent Node is more than its childs.' : 
        text1.innerHTML = 'Build Min Heap. Each Parent Node is less than its childs.';
}

function visualizeTree(nodes, edges) {
    document.getElementById('mynetwork').style = 'display:inline-block';
    let container = document.getElementById('mynetwork');
    let data= {
        nodes: nodes,
        edges: edges,
    };
    let options = {
        width: '600px',
        height: '400px',
        edges: {
            smooth: false,
            chosen: false,
            color: {
                inherit: 'to'
            }       
        },
        physics: false,
        interaction: {
            dragNodes: false,
            zoomView: false,
            dragView: false,
            hover: true
        },
        layout: {
            hierarchical: {
                enabled: true,
                parentCentralization: true,
                sortMethod: 'directed'
            }
        },
        nodes: {
            borderWidth: 1,
            borderWidthSelected: 2,
            chosen: false,
            color: {
                border: '#2B618E',
                background: '#AED8E5'
            },
            font: {
                color: 'black',
                size: 30,
                align: 'center'
            }
        }
    };
    network = new vis.Network(container, data, options);
}

function continueVisualization() {
    setHint(`Input Values ${MIN_VALUE} - ${MAX_VALUE}(included) or push`, 'black');
    document.getElementById('generate-values').style = 'display:inline-block';
    document.getElementById('step2').style = 'display:block;'
    createArrayTable();
}

function stopContinue() {
    document.getElementById('step2').style = 'display:none;'
    elementsCount <= 0 ? setHint('Please input more than 0 elements', 'red') : setHint(`Please input ${MAX_COUNT} or less elements`, 'red');
}

function setHint(message, color) {
    document.getElementById('array-elements-count-hint').innerHTML = message;
    document.getElementById('array-elements-count-hint').style = `color:${color};`
}

function hideVisualizationBlock() {
    arrNodes.forEach(node => {
        document.getElementById(`element${node.id-1}`).style = 'color:black;font-weight:normal;';
        disableElement(`element${node.id-1}`, false)});
    arrNodes = [];
    arrEdges = [];
    arrForEdges = [];
    isPaused = false;
    document.getElementById('pause').innerHTML = PAUSE;
    document.getElementById('array-elements-value-hint').style = 'display:none';
    document.getElementById('mynetwork').style = 'display:none';
    document.getElementById('text1').innerHTML = '';
    document.getElementById('text2').innerHTML = '';
    document.getElementById('text3').innerHTML = '';
    document.getElementById('text4').innerHTML = '';
    document.getElementById('text5').innerHTML = '';
    document.getElementById('text6').innerHTML = '';
    document.getElementById('text7').innerHTML = '';
}
    
function createArrayTable() {
    let table = '<table id="autogenerated-table">' + '<thead><tr><td>Array Index</td>';
    for(let i = 0; i < elementsCount; i++) {
        table += '<td>' + i + '</td>';
    }
    table += '</tr><tr><td>Array Value</td>';
    for(let i = 0; i < elementsCount; i++) {
        table += '<td><input id="element' + i + '" class="table-input" type="number" step="1" max="100" min="0"</td>';
    }
    table += '</tr></table>';
    document.getElementById('array-elements').innerHTML = table;
}

async function highlightInfo(i, info, isChanged, childCount, nodes) {
    if (isPaused) await delay();  
    let text2 = document.getElementById('text2');
    let text3 = document.getElementById('text3');
    let text4 = document.getElementById('text4');
    let text5 = document.getElementById('text5');
    
    text2.innerHTML = '';
    await sleep(1000);
    text3.innerHTML = '';
    text4.innerHTML = '';
    text5.innerHTML = '';
    
    text2.innerHTML = `Check ${i} element.`;
    await highlightNode(i, nodes);
    await sleep(timeMs);
    if (isPaused) await delay();
    text3.innerHTML = `Element ${i} with value ${arrNodes[i].label} has ${childCount} childs`;
    if (childCount > 0) {
        await sleep(timeMs);
        text4.innerHTML = `Is there any child ${info} than ${arrNodes[i].label}?`;
        await sleep(timeMs);
        if (isPaused) await delay();
        if (isChanged && !isStopped) text5.innerHTML = 'YES.';
        if (!isChanged && !isStopped) text5.innerHTML = 'NO.';
    }
    await sleep(timeMs);
}

async function highlighInfoChild(firstIndex, lastIndex, info, nodes) {
    let text6 = document.getElementById('text6');
    let text7 = document.getElementById('text7');
    
    if (isPaused) await delay();
    text6.innerHTML = `${arrNodes[lastIndex].label} is the ${info === LESS ? 'least' : 'biggest'} child of ${arrNodes[firstIndex].label}.`;
    await highlightNode(lastIndex, nodes);
    await sleep(timeMs);
    if (isPaused) await delay();
    text7.innerHTML = 'So we swap these values.';
}

async function dehighlightInfo(firstIndex, lastIndex, nodes) { 
    dehighlightNode(firstIndex, nodes);
    dehighlightNode(lastIndex, nodes);
    
    if (isPaused) await delay();
    document.getElementById('text2').innerHTML = '';
    document.getElementById('text3').innerHTML = '';
    document.getElementById('text4').innerHTML = '';
    document.getElementById('text5').innerHTML = '';
    document.getElementById('text6').innerHTML = '';
    document.getElementById('text7').innerHTML = '';
}

async function highlightNode(index, nodes) {
    if (isPaused) await delay();  
    document.getElementById(`element${index}`).style = 'color:red;font-weight:bold;';
    nodes.update([{id: index+1, color: {background: 'pink'}}]);
    nodes.update([{id: index+1, borderWidth: 2}]);
}

async function dehighlightNode(index, nodes) {
    if (isPaused) await delay();  
    document.getElementById(`element${index}`).style = 'color:black;font-weight:normal;';
    nodes.update([{id: index+1, color: {background: '#AED8E5'}}]);
    nodes.update([{id: index+1, borderWidth: 1}]);
}

async function hideNode(lastIndex, nodes) {
    if (isPaused) await delay();  
    document.getElementById(`element${lastIndex}`).style = 'color:grey;font-weight:bold;';
    //hide node and edge in tree
    nodes.update([{id: lastIndex+1, color: {border: 'grey', background: 'lightgrey'}}]);
    nodes.update([{id: lastIndex+1, borderWidth: 0}]);
    nodes.update([{id: lastIndex+1, font: {color: 'grey'}}]);
}

async function delay()  {
    while(isPaused) {
        await sleep(100);
    }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function disableElement(buttonId, val) {
    document.getElementById(buttonId).disabled = val;
}
