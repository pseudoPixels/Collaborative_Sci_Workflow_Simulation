//tree implementation starts

//node construct
function Node(data) {
  this.data = data;
  this.parent = null;
  this.isLocked = false;
  this.currentOwner = "NONE";
  this.children = [];
}

//tree construct
function Tree(data) {
  var node = new Node(data);
  this._root = node;
}

//traverse the tree by df default starting from the root of the tree
Tree.prototype.traverseDF = function(callback) {

  // this is a recurse and immediately-invoking function
  (function recurse(currentNode) {
    // step 2
    for (var i = 0, length = currentNode.children.length; i < length; i++) {
      // step 3
      recurse(currentNode.children[i]);
    }

    // step 4
    callback(currentNode);

    // step 1
  })(this._root);

};

//traverse by depth first search from a specified start node (parent)
Tree.prototype.traverseDF_FromNode = function(startNode, callback) {

  // this is a recurse and immediately-invoking function
  (function recurse(currentNode) {
    // step 2
    for (var i = 0, length = currentNode.children.length; i < length; i++) {
      // step 3
      recurse(currentNode.children[i]);
    }

    // step 4
    callback(currentNode);

    // step 1
  })(startNode);

};

//scans through all the nodes of the tree
Tree.prototype.contains = function(callback, traversal) {
  traversal.call(this, callback);

};

//add a new node to a specific parent of the tree
Tree.prototype.add = function(data, toData, traversal) {
  var child = new Node(data),
    parent = null,
    callback = function(node) {
      if (node.data === toData) {
        parent = node;
      }
    };

  this.contains(callback, traversal);

  if (parent) {
    parent.children.push(child);
    child.parent = parent;
  } else {
    throw new Error('Cannot add node to a non-existent parent.');
  }
  //return the newly created node
  return child;
};

//change the parent of a node to a new specified parent. the whole subtree (descendants)
//moves along the node.
Tree.prototype.changeParent = function(data, newParentData, traversal) {
  var targetNode = null,
    oldParent = null,
    callback = function(node) {
      if (node.data === data) {
        oldParent = node.parent;
        targetNode = node;
      }
    };

  this.contains(callback, traversal);

  if (oldParent) {
    index = findIndex(oldParent.children, data);

    if (index === undefined) {
      throw new Error('Node to change parents of does not exist.');
    } else {
      nodeToChangeParentOf = oldParent.children.splice(index, 1);

      var newParent = null,
        newParentCallback = function(node) {
          if (node.data === newParentData) {
            newParent = node;
          }
        };

      this.contains(newParentCallback, traversal);

      if (newParent) {
        newParent.children.push(targetNode);
        targetNode.parent = newParent;
        //alert(newParent.children[0].data);
      } else {
        throw new Error('New Parent Does not exist!');
      }


    }


  } else {
    throw new Error('The node did not have any previous parent!');
  }

};

//removes a particular node from its parent.
Tree.prototype.remove = function(data, fromData, traversal) {
  var tree = this,
    parent = null,
    childToRemove = null,
    index;

  var callback = function(node) {
    if (node.data === fromData) {
      parent = node;
    }
  };

  this.contains(callback, traversal);

  if (parent) {
    index = findIndex(parent.children, data);

    if (index === undefined) {
      throw new Error('Node to remove does not exist.');
    } else {
      childToRemove = parent.children.splice(index, 1);
    }
  } else {
    throw new Error('Parent does not exist.');
  }

  return childToRemove;
};

//returns node object, given its node data
Tree.prototype.getNode = function(nodeData, traversal) {
  var theNode = null,
    callback = function(node) {
      if (node.data === nodeData) {
        theNode = node;
      }
    };
  this.contains(callback, traversal);

  return theNode;

}

//check if the node or any of its descendants are locked currently.
//if not, the node floor is available as per the client request.
Tree.prototype.isNodeFloorAvailable = function(nodeData, traversal) {
  var theNode = this.getNode(nodeData, traversal);
  if (theNode == null) {
    throw new Error('The requested node for access does not exist!');
  }

  //if the node is itself locked, then its NOT available for the requested user
  if (theNode.isLocked == true) return false;

  //if the node itself is not locked, check if any of its children are locked or not
  //if any of them are locked, the access is NOT granted...
  var nodeFloorAvailability = true;
  this.traverseDF_FromNode(theNode, function(node) {
    //if any of its descendants are locked currently, the node access is not available
    if (node.isLocked == true) nodeFloorAvailability = false;
  });


  return nodeFloorAvailability;

}

//someone has got the access to this node, so lock it and all its descendants
Tree.prototype.lockThisNodeAndDescendants = function(newOwner, nodeData, traversal) {
  var theNode = this.getNode(nodeData, traversal);
  this.traverseDF_FromNode(theNode, function(node) {
    //use helper function to load this node for the corresponding user
    lockNode(node, newOwner);
  });
}

//someone has released the access to this node, so UNLOCK it and all its descendants
Tree.prototype.unlockThisNodeAndDescendants = function(nodeData, traversal) {
  var theNode = this.getNode(nodeData, traversal);
  this.traverseDF_FromNode(theNode, function(node) {
    //use the helper function to unlock the node.
    unlockNode(node);
  });
}


//HELPER FUNCTION: child index
function findIndex(arr, data) {
  var index;

  for (var i = 0; i < arr.length; i++) {
    if (arr[i].data === data) {
      index = i;
    }
  }

  return index;
}

//HELPER FUNCTION: lock a given node with corresponding owner name
function lockNode(node, nodeOwner) {
  node.isLocked = true;
  node.currentOwner = nodeOwner;
}

//HELPER FUNCTION: unlock a node
function unlockNode(node) {
  node.isLocked = false;
  node.currentOwner = "NONE";
}

//====================
//tree implementation ends
//====================






//Server Side vars and algorithms
var grantedNodeAccesses = []; //{node,collaborator_id}
var waitingNodeAccessRequests = []; //{node,collaborator_id}

function newNodeAccessRequest(collaboratorID, nodeID) {
  var theNode = workflow.getNode(nodeID, workflow.traverseDF);

  //if the node floor is available currently, then grant the access
  if (workflow.isNodeFloorAvailable(theNode.data, workflow.traverseDF)) {
    var aGrantedNodeAccess = {
      "collaboratorID": collaboratorID,
      "node": theNode.data
    };
    //add the node access granted request to the Q
    grantedNodeAccesses.push(aGrantedNodeAccess);
    //finally lock the node for the corresponding collaborator
    workflow.lockThisNodeAndDescendants(collaboratorID, theNode.data, workflow.traverseDF);
  } else { //some other collaborator has the node access currently, so need to wait
    var anWaitingNodeAccessRequest = {
      "collaboratorID": collaboratorID,
      "node": theNode.data
    };
    waitingNodeAccessRequests.push(anWaitingNodeAccessRequest);
  }

}


function releaseNodeAccess(collaboratorID, nodeID) {
  var theNode = workflow.getNode(nodeID, workflow.traverseDF);

  //release the node, in case its a valid request
  if (isValidNodeReleaseRequest(collaboratorID, theNode.data) == true) {
    //remove from the granted list
    removeFromGrantedRequestList(collaboratorID, theNode.data);
    //unlock the nodes in the workflow tree as well
    workflow.unlockThisNodeAndDescendants(nodeID, workflow.traverseDF);

    //after this node release, check if any waiting request can be served...
    tryServingFromWaitingRequests();

  } else {
    console.log("INVALID NODE ACCESS RELEASE REQUEST!");
  }




}


//helper functions for node release
function isValidNodeReleaseRequest(collaborator, node) {
  var isValid = false;

  for (var i = 0; i < grantedNodeAccesses.length; i++) {
    if (grantedNodeAccesses[i]["collaboratorID"] == collaborator && grantedNodeAccesses[i]["node"] == node) {
      isValid = true;
    }
  }

  return isValid;

}


function removeFromGrantedRequestList(collaborator, node) {
  var tmpGrantedList = [];

  for (var i = 0; i < grantedNodeAccesses.length; i++) {
    if (!(grantedNodeAccesses[i]["collaboratorID"] == collaborator && grantedNodeAccesses[i]["node"] == node)) {
      tmpGrantedList.push(grantedNodeAccesses[i]);
    }
  }

  grantedNodeAccesses = tmpGrantedList;

}




function removeFromWaitingList(collaborator, node) {
  var tmpWaitingList = [];

  for (var i = 0; i < waitingNodeAccessRequests.length; i++) {
    if (!(waitingNodeAccessRequests[i]["collaboratorID"] == collaborator && waitingNodeAccessRequests[i]["node"] == node)) {
      tmpWaitingList.push(waitingNodeAccessRequests[i]);
    }
  }

  waitingNodeAccessRequests = tmpWaitingList;

}







function tryServingFromWaitingRequests() {
  var tmpWaitingList = [];

  for (var i = 0; i < waitingNodeAccessRequests.length; i++) {
    if (workflow.isNodeFloorAvailable(waitingNodeAccessRequests[i]["node"], workflow.traverseDF) == true) {
      //make this node request and it will be granted for sure
      newNodeAccessRequest(waitingNodeAccessRequests[i]["collaboratorID"], waitingNodeAccessRequests[i]["node"]);
      //remove the granted node request from the waiting list
      removeFromWaitingList(waitingNodeAccessRequests[i]["collaboratorID"], waitingNodeAccessRequests[i]["node"]);
    }
  }

}



function isTheNodeInThisList(theList, nodeID){
    var isUserLocked = false;

    for(var i=0; i < theList.length; i++){
        if(theList[i]["node"] == nodeID){
            isUserLocked = true;
        }
    }

    return isUserLocked;
}





//upto 30 collaborators... each 100 instructions
var workflow_instructions = [
['4348','updateParam','9214','updateParam','6331','updateDatalink','2569','updateDatalink','4941','updateDatalink','9061','updateDatalink','2155','updateDatalink','7419','updateDatalink','7060','updateDatalink','3994','updateDatalink','5935','updateParam','5501','updateDatalink','6978','addModule','7534','addModule','2917','updateDatalink','4093','updateDatalink','2766','updateParam','3380','updateParam','7972','updateDatalink','7108','updateParam','4199','updateDatalink','2573','addModule','4005','addModule','4749','updateParam','3662','updateParam','5642','updateDatalink','9359','updateDatalink','4164','addModule','4057','updateParam','5768','updateParam','2222','updateDatalink','5105','updateParam','7710','updateParam','8938','addModule','6033','addModule','8581','addModule','6274','updateDatalink','7099','updateDatalink','7886','updateDatalink','2519','updateParam','3638','addModule','8318','updateDatalink','5942','updateParam','4414','addModule','7834','addModule','3935','addModule','9830','updateDatalink','8992','updateDatalink','7940','addModule','8723','updateParam','2054','updateParam','8858','updateDatalink','7989','updateDatalink','6039','updateParam','4403','updateParam','8162','updateDatalink','5874','updateParam','5984','updateDatalink','9351','updateParam','5247','addModule','5255','addModule','8561','updateDatalink','8469','updateParam','8311','addModule','4465','updateParam','7825','updateParam','5828','addModule','4058','updateDatalink','2416','updateParam','5044','addModule','8408','updateParam','7359','updateDatalink','5504','addModule','6855','updateDatalink','9500','addModule','7906','updateDatalink','3518','updateDatalink','8420','addModule','5117','addModule','5869','addModule','2546','updateParam','9580','updateParam','3395','updateDatalink','8550','updateDatalink','2877','addModule','8014','addModule','3005','addModule','4042','updateDatalink','9913','updateDatalink','9393','addModule','4557','addModule','7886','updateParam','6071','updateParam','6538','updateDatalink','7002','updateParam','6722','addModule','3691','addModule','7578','updateDatalink','5045','updateParam','6953','addModule'],
['2945','addModule','9099','addModule','3548','updateParam','4392','updateParam','6735','addModule','2310','updateDatalink','8936','addModule','2929','updateParam','4609','updateParam','4191','updateDatalink','5603','addModule','2177','updateParam','5662','updateDatalink','9655','addModule','5321','updateDatalink','2135','updateDatalink','8441','addModule','8701','updateParam','9641','addModule','8842','addModule','3856','updateDatalink','4570','updateParam','5305','updateDatalink','9032','updateDatalink','3082','updateParam','8904','updateParam','8650','addModule','9792','updateDatalink','2467','updateParam','5900','updateParam','7012','updateParam','7218','updateDatalink','5439','updateDatalink','5468','updateDatalink','5136','addModule','4073','updateParam','5410','addModule','9385','updateParam','8579','updateParam','4437','updateDatalink','9686','updateDatalink','2452','addModule','8119','updateDatalink','9371','addModule','8367','updateDatalink','8651','updateParam','5160','addModule','5569','updateDatalink','8260','updateDatalink','4303','addModule','6137','updateParam','3015','addModule','3783','addModule','8218','updateParam','9924','updateParam','9639','addModule','4868','addModule','4860','addModule','4241','updateParam','6973','updateParam','9871','updateDatalink','4495','updateDatalink','3056','updateParam','6808','addModule','3477','updateParam','8354','addModule','4998','updateDatalink','4852','updateDatalink','3608','addModule','6783','addModule','8757','updateDatalink','7382','addModule','5325','updateDatalink','2404','addModule','5492','addModule','2903','updateParam','5738','addModule','2271','updateParam','4241','addModule','6804','addModule','5912','addModule','3023','addModule','2322','updateDatalink','3015','addModule','5771','addModule','9042','addModule','4742','updateDatalink','6660','updateParam','8005','addModule','3610','updateParam','4602','updateParam','7718','updateParam','6980','updateParam','9066','updateDatalink','4506','updateDatalink','3676','updateParam','2637','updateParam','3959','addModule','6963','updateParam','9185','addModule'],
['7405','addModule','9208','updateDatalink','5797','updateParam','2718','updateDatalink','6105','updateParam','7253','addModule','2550','updateDatalink','2226','updateDatalink','4854','updateDatalink','6219','updateDatalink','7892','updateDatalink','5793','addModule','8974','addModule','9064','addModule','4024','updateDatalink','5294','updateParam','9898','addModule','7743','addModule','4087','updateDatalink','9049','updateParam','5073','addModule','2358','addModule','8563','updateParam','9482','updateDatalink','2872','updateDatalink','5316','updateDatalink','2690','addModule','7774','updateParam','4496','addModule','6488','addModule','2859','addModule','7523','updateParam','2881','updateParam','3362','updateParam','8028','updateDatalink','9397','updateDatalink','6605','updateDatalink','8200','addModule','8121','updateParam','6793','addModule','8793','addModule','8196','addModule','9441','updateDatalink','6489','addModule','5025','addModule','6630','updateDatalink','5072','addModule','2305','addModule','4242','updateParam','9026','updateDatalink','2286','updateDatalink','5758','updateParam','8649','updateParam','2305','addModule','2952','updateParam','5715','updateDatalink','2627','updateParam','6947','updateDatalink','8936','addModule','9056','updateParam','6634','updateDatalink','2142','updateParam','4515','updateParam','2321','updateDatalink','4114','updateDatalink','3948','updateDatalink','3778','updateParam','2374','updateParam','5402','updateParam','8449','addModule','3034','updateDatalink','4057','updateParam','8633','addModule','7907','updateParam','6216','updateParam','8845','addModule','9644','addModule','7924','updateParam','3293','updateDatalink','6502','addModule','4881','addModule','5593','addModule','5670','updateParam','5740','updateParam','3312','addModule','8656','addModule','2595','updateDatalink','9874','updateDatalink','7321','updateDatalink','7664','updateParam','6573','addModule','9474','updateDatalink','2627','addModule','5126','updateDatalink','3759','updateParam','8030','addModule','5180','updateDatalink','5671','addModule','9376','updateParam','8601','updateDatalink'],
['5075','updateParam','7203','addModule','4116','updateDatalink','9472','updateParam','7452','addModule','9055','addModule','7546','addModule','8814','addModule','2406','updateParam','5148','updateParam','8516','updateParam','2337','addModule','7895','addModule','2147','updateParam','8564','updateDatalink','5949','updateDatalink','9639','updateDatalink','6614','addModule','2323','updateDatalink','7408','updateParam','6034','updateParam','5168','updateDatalink','6927','addModule','6983','updateDatalink','6055','updateParam','9642','updateDatalink','4418','addModule','3105','addModule','4160','updateDatalink','7233','updateParam','5149','updateDatalink','3030','addModule','4201','addModule','7665','addModule','8195','updateDatalink','2490','updateParam','4328','addModule','3342','updateParam','2758','addModule','6349','updateParam','6893','updateParam','2506','updateDatalink','2568','updateDatalink','2265','updateParam','5360','updateDatalink','7392','updateDatalink','9298','addModule','7338','updateDatalink','4209','addModule','9381','updateDatalink','8962','addModule','3773','updateParam','7843','addModule','9165','addModule','9328','updateParam','3534','updateParam','2494','updateDatalink','5893','updateDatalink','6320','addModule','9999','addModule','3130','updateParam','3336','addModule','7425','updateParam','4616','addModule','5359','addModule','9038','updateDatalink','8101','updateParam','6565','updateDatalink','2339','updateDatalink','2472','updateParam','9180','updateParam','5405','updateDatalink','2680','updateParam','8202','addModule','3278','updateDatalink','6737','updateDatalink','9355','addModule','2030','updateParam','2198','updateParam','6860','addModule','7600','updateDatalink','2161','updateParam','9341','addModule','8422','updateDatalink','9826','addModule','9355','updateParam','9104','updateParam','5082','updateParam','5524','updateDatalink','4083','addModule','5295','updateDatalink','7163','addModule','8169','updateParam','8685','addModule','4533','updateDatalink','4312','updateDatalink','7128','updateDatalink','6525','updateDatalink','8660','updateDatalink','9150','addModule'],
['8564','updateParam','6149','updateDatalink','8141','updateParam','5933','updateDatalink','5348','updateParam','2437','updateDatalink','8474','updateParam','4208','updateParam','3958','updateParam','2765','updateDatalink','9596','updateDatalink','5467','updateDatalink','4389','updateParam','6157','updateParam','2287','updateDatalink','2806','addModule','5062','updateParam','7443','updateDatalink','5582','updateDatalink','5578','updateDatalink','8723','addModule','2414','updateDatalink','9169','updateDatalink','9053','updateParam','5355','updateDatalink','9982','updateDatalink','4801','updateDatalink','5070','addModule','4084','updateParam','7330','updateDatalink','2701','addModule','9698','updateParam','2080','addModule','2074','addModule','8969','addModule','3887','updateDatalink','2472','updateParam','9415','updateParam','3984','addModule','3130','addModule','9247','updateParam','6300','updateParam','9816','updateDatalink','8114','addModule','7157','updateDatalink','6571','addModule','6631','addModule','4380','addModule','6629','updateParam','9131','addModule','2091','addModule','2978','updateDatalink','9668','updateParam','3090','updateDatalink','5772','updateParam','2120','addModule','8767','updateDatalink','5931','updateDatalink','4557','addModule','5844','updateDatalink','2806','updateParam','6656','updateDatalink','3053','updateDatalink','3661','addModule','5966','updateParam','5951','updateParam','8991','updateDatalink','7220','updateParam','9633','updateParam','9340','updateDatalink','3636','updateParam','7956','updateParam','9300','addModule','5337','updateParam','9189','updateDatalink','7753','addModule','8479','updateParam','8608','addModule','5197','updateParam','2597','updateDatalink','7604','updateDatalink','8123','updateParam','5959','updateDatalink','7233','updateParam','9938','addModule','4315','updateDatalink','2930','updateParam','8819','updateParam','4481','updateParam','7234','addModule','4128','updateParam','9586','updateParam','5872','updateParam','3705','updateParam','2542','updateDatalink','6495','updateDatalink','7300','addModule','5484','updateParam','9537','updateDatalink','3885','updateDatalink'],
['6407','addModule','2414','updateParam','9258','updateDatalink','3139','addModule','8195','updateParam','4581','updateDatalink','2041','updateParam','9338','addModule','4934','updateDatalink','5470','addModule','8817','addModule','6910','updateDatalink','5066','updateDatalink','2122','updateParam','4514','updateDatalink','8296','updateParam','7111','addModule','8290','updateParam','4473','updateDatalink','7601','updateParam','6577','updateDatalink','4594','updateDatalink','7844','updateDatalink','7251','updateDatalink','3861','updateDatalink','9681','addModule','5998','updateDatalink','5650','updateDatalink','5160','updateDatalink','8375','updateParam','7934','updateParam','9835','updateDatalink','8373','updateDatalink','8842','updateParam','2679','updateParam','9134','addModule','6011','updateDatalink','4735','updateDatalink','2702','updateParam','5820','updateDatalink','5101','updateParam','2361','addModule','8317','updateParam','6771','updateParam','8093','updateDatalink','8831','updateDatalink','5085','updateDatalink','8121','updateParam','2765','updateDatalink','5219','addModule','2229','updateParam','4920','addModule','9133','updateDatalink','8716','updateParam','8032','updateDatalink','9791','addModule','7351','addModule','7787','addModule','6249','updateParam','8581','updateParam','2624','updateDatalink','2328','updateDatalink','5510','updateDatalink','5024','updateParam','3110','updateDatalink','4824','updateParam','9726','addModule','2392','addModule','6826','updateParam','2500','updateParam','5499','updateParam','2155','updateDatalink','5558','addModule','8483','addModule','6525','updateDatalink','3635','updateDatalink','5763','updateParam','9954','updateParam','2999','updateParam','4661','updateParam','2479','addModule','5306','updateDatalink','8025','updateDatalink','3230','updateParam','2226','updateParam','2301','updateParam','9020','updateParam','8158','updateDatalink','6919','updateDatalink','9226','addModule','8122','addModule','2740','addModule','6770','addModule','3046','updateDatalink','7593','updateDatalink','5403','updateParam','6194','updateDatalink','2565','updateParam','4228','addModule','3367','updateDatalink'],
['2717','updateDatalink','6581','updateParam','8761','addModule','7294','updateDatalink','6882','updateDatalink','5040','updateParam','2270','updateParam','2953','addModule','7155','addModule','7192','updateDatalink','5584','updateParam','7869','addModule','7829','updateDatalink','6753','updateDatalink','5690','addModule','8983','updateDatalink','3935','updateParam','4054','addModule','3137','updateDatalink','5307','updateDatalink','5144','updateParam','5201','addModule','4446','updateDatalink','3581','updateDatalink','4677','updateDatalink','6231','updateParam','7512','updateDatalink','6928','updateParam','5205','addModule','2269','addModule','4013','updateDatalink','4512','updateParam','5764','addModule','5681','updateParam','6815','updateDatalink','2191','updateDatalink','5653','updateParam','9234','addModule','6380','addModule','6180','updateDatalink','9346','updateParam','6250','updateParam','8169','updateDatalink','7699','updateParam','8395','updateDatalink','3763','updateDatalink','7051','updateParam','8633','updateDatalink','4338','addModule','4676','updateDatalink','2710','updateParam','8191','updateParam','8604','updateParam','6915','addModule','8049','updateDatalink','6557','updateParam','3421','updateParam','3587','updateDatalink','2594','addModule','9551','addModule','7720','updateDatalink','8138','addModule','6908','addModule','2279','updateDatalink','8043','updateParam','8503','updateParam','5990','addModule','3800','addModule','2447','updateDatalink','2269','updateParam','9682','updateDatalink','2768','addModule','5414','updateDatalink','8831','addModule','2081','addModule','6102','addModule','5754','addModule','2541','addModule','3938','updateDatalink','8633','updateParam','5513','addModule','6872','updateDatalink','8069','updateParam','3762','updateParam','3877','addModule','5572','updateDatalink','3758','addModule','3121','updateParam','6083','addModule','6818','updateParam','2169','addModule','9224','updateDatalink','9318','addModule','4374','updateDatalink','6743','updateParam','5124','updateDatalink','5633','updateDatalink','3749','addModule','8613','addModule','9072','updateParam'],
['9843','updateParam','9349','addModule','7006','addModule','2171','updateDatalink','8438','updateParam','4637','addModule','6649','updateDatalink','9033','addModule','5485','updateParam','5288','addModule','8178','updateParam','3435','updateParam','5538','updateDatalink','9345','addModule','7540','updateDatalink','6974','updateParam','5542','updateParam','4375','addModule','4403','updateDatalink','4726','updateDatalink','3739','updateDatalink','7626','updateDatalink','3563','addModule','5900','addModule','9577','updateDatalink','3182','updateDatalink','9345','updateDatalink','9497','addModule','6612','updateDatalink','8123','addModule','5014','updateDatalink','2961','addModule','4420','addModule','3675','addModule','5179','addModule','9842','updateDatalink','3496','updateDatalink','3372','addModule','5201','addModule','2445','addModule','9166','updateParam','2208','addModule','3598','updateDatalink','7493','updateDatalink','6491','updateParam','6797','addModule','9452','updateParam','4779','updateParam','8175','addModule','2526','addModule','2811','updateParam','2825','updateParam','7468','addModule','9714','updateParam','8105','updateParam','3535','addModule','4074','addModule','4765','addModule','8542','updateDatalink','7853','addModule','7059','updateParam','2328','updateParam','5519','updateParam','6422','updateDatalink','6755','updateDatalink','2452','updateParam','7029','addModule','3233','addModule','3665','addModule','2739','updateDatalink','9066','updateParam','8290','updateParam','6374','addModule','3504','updateParam','2029','updateParam','7260','addModule','6451','updateParam','5931','addModule','2132','addModule','4132','addModule','2356','addModule','3229','updateParam','3811','addModule','8872','addModule','8348','updateDatalink','4785','updateDatalink','5123','updateParam','2079','updateParam','8389','addModule','5325','addModule','2162','updateDatalink','4645','updateParam','7052','addModule','3068','updateDatalink','8458','addModule','4405','updateParam','9426','updateDatalink','2882','updateParam','3385','updateDatalink','3798','updateParam'],
['2025','addModule','4440','addModule','9570','updateParam','4522','addModule','6689','updateParam','7379','updateDatalink','3296','addModule','9189','updateDatalink','7496','addModule','9452','addModule','9911','addModule','7985','updateParam','6662','updateDatalink','5687','updateParam','8230','updateParam','6318','addModule','9457','updateParam','4543','updateParam','3946','updateParam','5487','updateDatalink','2098','updateParam','5066','updateDatalink','8034','updateParam','8325','updateDatalink','2667','updateParam','7045','updateParam','8158','updateDatalink','9865','updateDatalink','9012','addModule','6169','addModule','5074','updateParam','4990','updateParam','3653','addModule','6180','updateParam','2043','updateDatalink','5094','addModule','7688','updateDatalink','8037','addModule','3230','addModule','7734','updateParam','7702','updateParam','8061','updateParam','5114','updateDatalink','7290','updateDatalink','3673','updateDatalink','5103','updateDatalink','4896','addModule','6619','addModule','9873','addModule','8691','updateDatalink','9901','updateParam','5711','addModule','8781','updateParam','8191','addModule','7986','addModule','7348','updateDatalink','9985','updateDatalink','6963','updateParam','2947','updateParam','7755','updateDatalink','6091','addModule','9515','updateDatalink','2925','updateParam','4262','addModule','9627','updateDatalink','9662','addModule','9812','addModule','3959','addModule','2949','addModule','3679','updateDatalink','9657','addModule','9347','updateDatalink','9150','updateDatalink','4462','updateDatalink','4071','updateDatalink','5002','updateParam','3965','updateParam','8680','updateDatalink','2639','addModule','9226','addModule','4674','updateDatalink','4931','updateDatalink','8317','updateDatalink','6705','addModule','8015','updateParam','6903','updateParam','3845','addModule','2165','addModule','9082','updateParam','7524','addModule','3154','updateDatalink','3027','updateDatalink','5241','addModule','6124','addModule','7766','updateParam','3068','updateDatalink','9025','updateDatalink','4587','updateParam','4206','updateDatalink','7070','addModule'],
['6050','addModule','4511','addModule','2405','addModule','8482','updateParam','9917','updateParam','5359','addModule','3110','updateDatalink','8074','updateDatalink','6117','updateParam','3622','updateDatalink','6285','updateParam','9593','updateDatalink','8939','addModule','8968','updateParam','4521','updateDatalink','8422','updateParam','7378','updateDatalink','5404','addModule','9441','updateDatalink','5230','updateDatalink','8038','updateDatalink','9432','updateParam','7107','addModule','4636','updateParam','7039','updateDatalink','9199','updateParam','2425','updateDatalink','6860','updateDatalink','2926','updateParam','8661','updateParam','8552','updateParam','8380','addModule','2570','updateDatalink','8734','addModule','5304','updateDatalink','3591','updateParam','4080','updateDatalink','5454','updateParam','2559','addModule','3458','updateDatalink','4706','updateDatalink','5130','addModule','8663','updateDatalink','7173','updateDatalink','9746','addModule','8503','updateDatalink','7842','addModule','6814','updateParam','2449','updateDatalink','3899','updateDatalink','2600','addModule','8997','updateParam','2929','addModule','9390','updateParam','9133','addModule','9534','updateDatalink','8065','addModule','3942','updateDatalink','5729','updateDatalink','9091','addModule','4407','updateParam','3584','addModule','2179','addModule','5843','updateParam','6087','addModule','2552','updateParam','6181','updateParam','5128','addModule','5719','updateDatalink','3450','updateParam','6745','addModule','6108','updateParam','6312','updateDatalink','8410','updateDatalink','6601','addModule','5419','updateParam','6172','updateParam','3241','addModule','7607','updateDatalink','9835','updateDatalink','8806','updateParam','6591','addModule','5151','updateParam','9917','updateParam','9835','addModule','8100','addModule','7561','addModule','2674','addModule','8896','updateParam','3558','updateParam','8508','updateDatalink','7215','updateParam','6547','addModule','7062','updateParam','8416','updateDatalink','9411','addModule','2178','updateParam','8168','updateParam','4864','addModule','3546','updateParam'],
['8912','updateDatalink','2051','updateParam','7997','addModule','2976','addModule','5513','updateDatalink','4663','addModule','8928','addModule','3784','updateParam','9295','addModule','4884','updateDatalink','5146','updateParam','5439','updateParam','6026','updateDatalink','5682','updateParam','2923','updateDatalink','8446','addModule','8833','updateParam','2267','updateDatalink','4719','updateParam','5009','updateParam','6110','updateDatalink','9250','addModule','5589','updateParam','2685','addModule','6425','addModule','8796','addModule','6589','updateParam','9038','updateParam','4422','updateDatalink','3784','addModule','5182','updateParam','9298','addModule','3735','updateDatalink','7960','updateParam','2644','updateDatalink','9017','updateDatalink','8886','updateDatalink','5093','updateParam','4471','updateDatalink','5722','updateDatalink','2195','updateParam','5136','updateParam','5786','updateParam','9578','addModule','9689','updateDatalink','5375','updateParam','9744','updateParam','9035','updateDatalink','8002','addModule','8593','addModule','6936','addModule','9493','updateDatalink','8286','updateDatalink','2219','updateParam','3801','addModule','8954','updateParam','5117','updateParam','2491','updateParam','4028','updateParam','6677','updateParam','6398','updateParam','3605','updateParam','6962','updateDatalink','4837','updateParam','8268','addModule','7879','updateDatalink','7012','updateDatalink','3182','updateParam','3009','updateParam','8904','updateDatalink','2058','addModule','2685','addModule','3949','updateParam','7699','addModule','2855','addModule','2204','updateParam','7371','updateDatalink','5875','updateDatalink','3440','addModule','4138','updateParam','3419','updateParam','7782','addModule','8539','updateParam','5078','addModule','4002','addModule','7671','updateDatalink','5971','updateParam','3474','updateParam','7702','updateParam','9849','updateDatalink','4060','updateDatalink','8280','updateDatalink','5682','updateParam','9834','updateParam','6032','updateDatalink','8617','addModule','4589','updateParam','8513','addModule','9431','updateDatalink','8426','updateDatalink'],
['2461','updateDatalink','3296','addModule','6518','addModule','6127','updateDatalink','5635','updateDatalink','4277','addModule','9682','updateParam','7273','updateParam','6652','updateDatalink','3383','updateDatalink','5841','updateDatalink','6207','updateParam','3163','updateDatalink','8536','updateParam','7856','updateParam','8719','updateParam','9835','addModule','6807','updateParam','2928','addModule','7700','updateDatalink','7259','addModule','8572','addModule','6013','updateParam','7802','updateDatalink','3854','addModule','4672','addModule','2221','updateDatalink','3090','addModule','2775','addModule','4563','addModule','2229','updateParam','3701','addModule','9820','updateParam','3476','addModule','2679','addModule','7500','updateParam','2332','updateDatalink','6573','updateParam','3594','updateDatalink','4736','updateParam','3109','updateDatalink','6103','addModule','2775','updateParam','7697','updateDatalink','3312','addModule','7558','addModule','7215','updateDatalink','9367','addModule','6364','addModule','8830','updateParam','5500','addModule','7084','addModule','8864','updateParam','4366','updateParam','5216','addModule','3195','updateParam','6491','addModule','6325','addModule','7358','updateParam','6709','addModule','8906','updateDatalink','2733','updateDatalink','5733','addModule','3960','updateDatalink','7664','addModule','4644','addModule','3369','updateDatalink','2258','updateDatalink','9117','updateDatalink','6289','updateDatalink','5920','updateParam','2547','updateParam','4321','addModule','2238','updateParam','8071','updateDatalink','5059','addModule','3943','updateParam','5552','updateParam','4946','addModule','7976','updateDatalink','2167','updateDatalink','2944','updateParam','4514','updateParam','7080','addModule','5598','updateParam','6932','updateDatalink','8997','updateDatalink','4412','updateDatalink','7172','updateParam','4993','updateDatalink','5268','updateParam','9928','addModule','9058','updateParam','5727','addModule','4271','addModule','4158','updateDatalink','6570','updateDatalink','6005','updateDatalink','9415','addModule','5855','updateDatalink'],
['5068','updateDatalink','7130','updateDatalink','9987','updateParam','4658','updateParam','5865','updateParam','7991','updateParam','7555','updateParam','6748','updateParam','9136','updateDatalink','7222','updateDatalink','3375','updateDatalink','9499','updateParam','9822','updateParam','6353','updateParam','2800','addModule','9140','updateDatalink','2537','updateParam','5973','addModule','4683','updateDatalink','9406','updateParam','3474','updateDatalink','2882','updateDatalink','7783','addModule','7200','updateDatalink','9311','addModule','4248','updateParam','2173','updateParam','3245','updateParam','5118','addModule','2762','updateParam','9647','addModule','5742','updateDatalink','5264','updateDatalink','8798','addModule','5124','addModule','3024','addModule','7320','updateDatalink','3566','addModule','7056','addModule','9217','addModule','2968','addModule','5269','updateParam','8831','updateDatalink','6890','updateDatalink','5907','addModule','8258','addModule','7185','updateParam','2717','updateDatalink','8760','updateDatalink','3193','updateParam','7603','updateDatalink','4131','updateParam','4976','updateParam','6194','addModule','6728','addModule','4978','updateDatalink','3742','updateParam','8998','addModule','7766','updateDatalink','4177','updateParam','5886','addModule','2117','updateDatalink','4892','updateDatalink','9373','updateDatalink','4783','addModule','6996','addModule','8660','updateDatalink','9597','addModule','4263','addModule','5165','addModule','8402','updateParam','4917','updateDatalink','5517','updateDatalink','4397','updateParam','7642','addModule','5101','addModule','3001','updateDatalink','9864','updateDatalink','4497','addModule','5266','updateParam','5344','updateDatalink','4295','updateDatalink','5086','updateDatalink','2540','updateParam','9256','updateDatalink','9131','addModule','5932','updateParam','5715','addModule','6429','updateDatalink','2680','addModule','9377','updateParam','5905','updateDatalink','7451','addModule','7274','updateDatalink','7979','updateParam','4202','updateDatalink','2703','updateDatalink','9428','updateParam','9921','updateParam','8330','updateDatalink'],
['4274','updateDatalink','8992','updateParam','9422','updateParam','6304','updateParam','8862','addModule','5309','updateParam','6137','updateParam','5085','updateDatalink','9681','updateDatalink','8373','updateDatalink','9565','updateDatalink','6238','addModule','9369','updateDatalink','2983','updateParam','4458','updateDatalink','6585','updateDatalink','9892','updateDatalink','9898','addModule','5225','addModule','7864','updateParam','3451','updateParam','3998','updateParam','7336','addModule','3384','updateParam','4391','updateParam','9436','updateParam','3734','updateParam','5681','updateParam','2102','updateDatalink','3797','updateDatalink','2237','addModule','3176','updateParam','2930','updateParam','7250','updateDatalink','3943','updateDatalink','5828','addModule','9081','updateDatalink','4709','updateParam','6642','addModule','3796','updateDatalink','6526','updateDatalink','4989','updateDatalink','9216','addModule','7087','addModule','9912','addModule','4958','updateParam','9049','updateDatalink','6221','addModule','4462','updateDatalink','2697','addModule','8432','updateDatalink','5879','addModule','8886','addModule','3655','updateDatalink','5971','updateParam','3565','addModule','3285','addModule','3806','updateDatalink','4988','updateDatalink','9264','updateParam','2058','updateParam','5805','updateParam','6935','updateDatalink','2088','updateParam','7809','addModule','4141','addModule','5795','updateParam','7945','addModule','6251','updateParam','3300','updateParam','7487','addModule','2187','addModule','2114','updateDatalink','4914','updateDatalink','2279','addModule','5267','updateParam','8051','addModule','3925','updateParam','2186','updateParam','3399','updateDatalink','2544','updateParam','9732','updateParam','7384','updateDatalink','6211','addModule','8811','addModule','4355','updateParam','5608','updateParam','9404','addModule','6710','updateDatalink','5588','updateDatalink','4567','updateParam','6403','updateDatalink','5650','updateParam','3156','addModule','9344','addModule','9021','updateDatalink','6489','addModule','7869','updateDatalink','8803','updateParam','5108','updateDatalink'],
['4451','updateDatalink','5784','addModule','3000','updateParam','5210','addModule','9022','addModule','9353','addModule','7582','addModule','2229','updateDatalink','8864','updateDatalink','5586','updateParam','3198','addModule','4073','updateParam','9717','updateParam','9205','addModule','5907','updateParam','3315','addModule','9305','updateParam','4799','updateParam','2578','updateDatalink','3851','updateDatalink','5246','updateDatalink','9984','updateParam','7300','updateDatalink','8552','addModule','3954','updateParam','3553','addModule','6791','updateDatalink','7926','updateDatalink','6549','addModule','6638','updateParam','2798','updateDatalink','9768','updateParam','3759','addModule','4864','updateParam','7508','addModule','5820','updateParam','3829','updateParam','7507','addModule','7952','addModule','3428','addModule','5430','updateDatalink','3644','updateParam','3413','updateDatalink','2197','updateParam','3558','updateDatalink','7319','updateDatalink','3830','updateParam','3645','updateDatalink','4446','updateDatalink','7692','addModule','5207','addModule','5861','updateDatalink','9470','updateDatalink','8197','updateParam','6015','addModule','7165','addModule','8051','addModule','2698','addModule','8605','addModule','2757','addModule','3566','addModule','8650','updateDatalink','5607','updateDatalink','6379','addModule','8253','updateParam','5245','addModule','7340','addModule','8969','addModule','7114','updateDatalink','8580','addModule','6219','updateParam','2317','updateDatalink','2826','addModule','3803','updateParam','6159','addModule','3723','updateParam','5646','updateDatalink','6279','addModule','4982','updateParam','9652','updateParam','8313','updateDatalink','3736','updateParam','9824','updateParam','6387','addModule','9960','addModule','3430','updateParam','5541','addModule','5693','updateDatalink','9017','addModule','8297','updateParam','4114','updateParam','9467','updateParam','5119','updateDatalink','2107','updateParam','7058','addModule','7394','updateDatalink','2011','updateDatalink','7629','updateDatalink','8824','updateDatalink','7610','updateParam'],
['3454','updateDatalink','9775','updateDatalink','9210','updateParam','4348','addModule','2132','updateDatalink','7766','addModule','2763','addModule','2605','updateDatalink','9559','updateParam','4286','updateDatalink','9189','addModule','3789','addModule','6983','addModule','3635','updateParam','8757','updateParam','8382','addModule','9294','addModule','2887','updateParam','6704','addModule','3590','updateDatalink','9931','addModule','8050','updateParam','2646','updateParam','8008','addModule','6786','addModule','3215','updateDatalink','8979','updateParam','5267','updateParam','5112','updateDatalink','8718','updateDatalink','6288','updateParam','6696','updateParam','5427','addModule','4295','updateDatalink','3753','updateParam','2975','addModule','8424','updateParam','5236','addModule','4555','addModule','4795','addModule','4874','updateParam','3544','addModule','4281','addModule','4511','updateParam','6534','addModule','6091','updateDatalink','6334','addModule','2798','updateDatalink','6050','updateParam','9772','updateDatalink','6334','updateParam','4310','updateParam','9871','updateParam','9662','updateDatalink','9529','updateParam','6336','updateParam','8145','addModule','8175','addModule','9199','updateDatalink','4451','updateDatalink','9633','updateParam','9217','addModule','6060','addModule','7181','addModule','5612','updateParam','5344','updateParam','4676','updateParam','3651','updateParam','6781','updateDatalink','5916','updateDatalink','2861','updateDatalink','4248','updateDatalink','9171','updateParam','2257','updateDatalink','6085','updateParam','2270','updateDatalink','9044','updateParam','5808','updateParam','2883','addModule','8590','addModule','2808','updateParam','7286','addModule','5258','addModule','7306','updateParam','3915','updateDatalink','8836','addModule','2091','addModule','8401','updateParam','4774','addModule','9191','updateDatalink','9545','updateDatalink','5399','addModule','3652','addModule','5828','addModule','2468','addModule','6017','updateDatalink','8586','updateDatalink','6124','updateParam','6808','updateDatalink','7830','updateParam'],
['2281','updateDatalink','7509','addModule','9011','updateParam','6915','updateParam','4026','updateDatalink','2627','updateDatalink','2430','addModule','7519','addModule','4592','addModule','9490','updateDatalink','2732','addModule','8709','updateDatalink','6143','updateParam','6633','updateParam','8305','updateParam','8029','updateParam','7141','addModule','5274','updateParam','9661','addModule','6158','updateParam','4251','updateDatalink','2466','updateParam','7845','addModule','4563','updateParam','3249','updateParam','7255','updateDatalink','9842','updateParam','4159','updateDatalink','6928','updateDatalink','3839','updateDatalink','8977','updateDatalink','4962','updateDatalink','4003','updateParam','3718','addModule','6333','updateDatalink','6750','updateParam','7019','addModule','2857','updateParam','9144','updateParam','2712','addModule','3256','updateDatalink','3838','addModule','6211','updateDatalink','6110','addModule','2636','updateParam','7016','updateDatalink','8303','updateParam','5935','updateDatalink','6628','updateParam','2680','addModule','9567','updateParam','3559','updateDatalink','2154','addModule','4202','updateDatalink','5929','updateParam','2397','addModule','4500','updateDatalink','2200','updateDatalink','6507','addModule','6558','updateParam','5216','addModule','7692','addModule','6011','addModule','4504','addModule','9024','updateParam','8247','updateParam','6154','updateDatalink','9706','updateDatalink','7728','addModule','5151','updateDatalink','6054','addModule','6301','updateDatalink','3114','addModule','3556','updateDatalink','9645','updateParam','7746','updateParam','6864','updateParam','3639','addModule','2080','updateParam','4475','updateParam','9453','addModule','8757','updateParam','7135','updateDatalink','8559','updateDatalink','6062','addModule','2604','addModule','9624','updateDatalink','3355','addModule','7484','updateDatalink','7368','addModule','6793','updateDatalink','6168','addModule','4027','addModule','6885','updateParam','4737','updateParam','3907','addModule','2422','updateParam','6798','addModule','7802','updateDatalink','9737','updateParam'],
['7730','updateDatalink','7712','addModule','8990','addModule','8740','updateParam','6245','addModule','3348','updateDatalink','5365','updateParam','8569','updateDatalink','5404','addModule','3704','addModule','6463','updateDatalink','3104','addModule','2694','updateParam','3208','addModule','3696','updateParam','9109','updateParam','3553','addModule','5874','addModule','4757','updateDatalink','7888','updateDatalink','8280','updateParam','3460','updateParam','5028','updateParam','7942','updateDatalink','7941','updateParam','2622','updateParam','7985','updateParam','4624','addModule','5276','updateParam','5075','updateDatalink','6607','addModule','4795','addModule','4603','updateParam','4742','updateDatalink','5778','addModule','4482','updateDatalink','2725','addModule','9916','updateParam','5697','updateParam','7533','addModule','4836','addModule','2415','updateParam','2282','updateParam','5273','addModule','9430','addModule','9737','updateDatalink','4576','updateParam','5163','addModule','2204','updateDatalink','2215','addModule','5157','addModule','4451','updateDatalink','6964','updateDatalink','7180','updateParam','7539','updateDatalink','4834','updateDatalink','9536','updateDatalink','8107','updateDatalink','6582','updateParam','4109','updateDatalink','2664','addModule','4781','updateDatalink','9896','updateParam','4833','updateDatalink','7926','updateParam','2445','addModule','4248','updateDatalink','7979','updateParam','2633','updateDatalink','9964','updateParam','2970','updateDatalink','7590','updateDatalink','7737','updateParam','6974','addModule','6364','updateParam','2437','updateParam','8739','updateDatalink','8045','updateParam','3105','updateParam','8674','updateParam','5594','addModule','7831','updateDatalink','4653','updateParam','9497','addModule','7616','updateParam','7231','updateDatalink','8656','updateDatalink','9796','addModule','5388','updateDatalink','8542','updateDatalink','3356','updateParam','3814','updateDatalink','7664','updateParam','3618','updateDatalink','4996','updateParam','7805','updateParam','7278','updateDatalink','3024','updateDatalink','8227','updateDatalink','5686','addModule'],
['4048','updateParam','2194','addModule','9513','addModule','7694','updateParam','4686','updateDatalink','4586','updateDatalink','7537','updateParam','6048','addModule','7699','addModule','5837','updateDatalink','4610','addModule','3595','updateDatalink','5301','updateDatalink','2925','updateParam','9073','updateParam','3478','updateDatalink','2313','addModule','4316','updateDatalink','6706','addModule','7781','addModule','4077','addModule','9130','updateParam','5136','updateDatalink','9194','addModule','5354','updateParam','3291','addModule','7237','addModule','7664','updateParam','4235','addModule','4682','addModule','9544','addModule','4054','updateDatalink','9048','addModule','5310','updateDatalink','9653','updateParam','2799','updateDatalink','6260','updateParam','2452','updateDatalink','6630','addModule','7559','addModule','9388','updateDatalink','6816','updateDatalink','2418','updateDatalink','9880','updateParam','4903','updateDatalink','3699','updateParam','4243','addModule','2847','updateParam','3134','addModule','3139','updateParam','4017','updateDatalink','3743','updateDatalink','2181','updateParam','3075','addModule','6749','updateDatalink','5700','updateDatalink','8811','updateDatalink','9501','addModule','3946','updateParam','2363','updateParam','4376','updateDatalink','9623','updateDatalink','4026','updateDatalink','5539','updateParam','7709','addModule','2015','addModule','7717','updateDatalink','7857','addModule','3037','updateParam','3776','updateParam','8470','addModule','2424','updateDatalink','4884','updateDatalink','2684','updateParam','9860','updateDatalink','3481','updateDatalink','3978','addModule','6357','updateDatalink','3994','updateParam','4059','addModule','2157','addModule','4402','updateDatalink','6918','updateParam','6635','addModule','8277','updateParam','3579','updateParam','7023','addModule','6787','updateDatalink','3116','addModule','7953','addModule','2451','addModule','9855','updateParam','9280','updateParam','8049','updateParam','7502','updateParam','8591','updateParam','2112','addModule','3012','updateDatalink','4036','updateDatalink','9821','updateParam'],
['5597','addModule','7761','updateDatalink','5886','updateParam','6096','updateParam','5265','addModule','5146','updateDatalink','4262','updateParam','4352','updateDatalink','6104','updateParam','3102','updateParam','2152','updateParam','7566','updateParam','3460','addModule','4809','updateDatalink','9736','updateDatalink','5409','updateParam','2944','addModule','3847','updateParam','8788','updateDatalink','5907','addModule','9344','updateParam','4349','updateDatalink','6082','updateParam','4093','addModule','8524','updateParam','2164','updateDatalink','7799','addModule','7665','updateParam','6334','addModule','7005','updateParam','2936','addModule','7644','addModule','4516','updateParam','9611','updateParam','3706','updateDatalink','6027','updateParam','9611','updateParam','5903','updateDatalink','6952','updateDatalink','4446','updateDatalink','2860','updateDatalink','6137','updateParam','4546','updateParam','9821','updateDatalink','7120','updateDatalink','5063','addModule','2800','updateParam','9020','updateDatalink','2760','addModule','9080','updateParam','2870','updateParam','8513','updateParam','4575','addModule','8393','addModule','6164','updateParam','3030','updateDatalink','3686','updateParam','6170','addModule','4747','updateParam','9214','updateDatalink','6453','updateParam','8696','updateParam','4745','updateDatalink','4280','updateDatalink','2374','updateParam','8528','addModule','2758','addModule','9672','addModule','4997','updateDatalink','8659','updateParam','3259','addModule','7715','addModule','5824','updateParam','7665','updateParam','5004','updateParam','3277','updateDatalink','9217','addModule','9866','updateParam','4438','updateParam','6420','updateDatalink','4304','updateDatalink','4482','updateParam','8099','addModule','8059','updateParam','9887','addModule','9788','updateParam','6028','updateParam','4620','addModule','8346','addModule','6271','updateParam','2172','updateParam','7691','addModule','8547','addModule','6787','addModule','5793','addModule','6682','addModule','5747','updateParam','7716','addModule','7871','updateParam','4482','addModule'],
['6503','updateParam','5118','updateParam','6512','addModule','6113','addModule','6573','updateDatalink','3889','updateParam','9355','addModule','8387','updateParam','9828','updateDatalink','3922','updateParam','4977','updateDatalink','6562','updateParam','8152','updateParam','3256','updateDatalink','7302','updateParam','9998','addModule','2357','updateDatalink','2236','addModule','5001','addModule','2815','updateParam','8080','addModule','8670','addModule','7904','addModule','9548','updateParam','6694','updateDatalink','3984','updateDatalink','6407','updateParam','9802','addModule','9216','updateParam','6378','addModule','3871','updateDatalink','5912','updateParam','9207','addModule','6982','addModule','2037','addModule','3594','addModule','8686','updateDatalink','3014','updateParam','3425','updateDatalink','9605','updateParam','5031','updateDatalink','7935','addModule','6747','updateParam','6399','updateParam','2884','updateParam','6606','addModule','3307','addModule','7782','updateDatalink','3064','updateDatalink','7442','updateParam','6410','updateParam','3569','updateParam','8466','updateDatalink','7570','updateDatalink','9771','updateDatalink','9239','updateDatalink','6973','addModule','6988','updateDatalink','2914','addModule','4595','updateParam','3356','updateParam','7716','updateParam','3588','updateParam','9414','updateDatalink','4187','updateDatalink','5954','updateDatalink','3163','addModule','8109','addModule','3741','addModule','9240','updateDatalink','9044','updateParam','3383','addModule','2904','updateParam','6607','updateDatalink','8075','updateParam','6885','updateDatalink','5078','updateParam','3733','updateDatalink','2942','updateParam','6865','updateDatalink','5086','updateDatalink','3106','addModule','9585','updateDatalink','8834','addModule','3084','addModule','9175','updateDatalink','7600','updateDatalink','5218','addModule','3461','addModule','2503','updateDatalink','3644','updateDatalink','2012','updateParam','6747','updateDatalink','2934','updateParam','7849','addModule','6442','addModule','2521','addModule','5738','addModule','3218','updateDatalink','7613','updateDatalink'],
['3317','updateParam','6773','updateParam','4040','updateParam','6175','updateParam','7527','addModule','4641','updateDatalink','3289','updateParam','4972','updateDatalink','3311','addModule','3843','updateParam','9036','updateParam','8700','updateParam','5502','updateDatalink','2935','addModule','9854','updateParam','8565','updateDatalink','5511','updateDatalink','7686','addModule','5219','addModule','7937','updateParam','2237','updateParam','5232','updateParam','4925','updateParam','9008','addModule','9967','updateParam','3235','updateDatalink','5483','addModule','8448','addModule','3287','updateParam','6036','updateParam','7531','updateParam','2059','updateDatalink','6990','updateParam','7814','addModule','2240','updateParam','6434','updateParam','2975','updateParam','2740','updateDatalink','6717','addModule','9614','addModule','6161','updateParam','4137','addModule','4417','addModule','2740','updateDatalink','5388','updateParam','8630','addModule','6543','addModule','4713','addModule','9326','updateParam','9308','updateDatalink','2457','updateParam','7850','updateDatalink','5378','addModule','9879','addModule','7083','addModule','4535','updateDatalink','7593','updateDatalink','7823','updateDatalink','5317','addModule','6885','updateParam','9564','updateParam','2553','addModule','9430','updateDatalink','3399','updateParam','2340','updateDatalink','4567','updateDatalink','5473','updateDatalink','4613','updateParam','9329','updateDatalink','5609','addModule','4689','addModule','9765','updateDatalink','2208','updateParam','5818','addModule','7913','updateParam','6439','updateParam','9824','updateDatalink','9894','addModule','2982','updateDatalink','3233','updateDatalink','4105','addModule','8243','addModule','3142','updateDatalink','7408','updateParam','2964','updateParam','7145','updateParam','6449','updateDatalink','3546','updateDatalink','6204','addModule','3899','addModule','4181','updateDatalink','5208','updateDatalink','4429','updateDatalink','2990','updateDatalink','6242','updateDatalink','3586','updateDatalink','4944','updateDatalink','9236','updateParam','3567','updateDatalink','5166','addModule'],
['2666','updateDatalink','5949','addModule','3530','addModule','6376','updateDatalink','8029','updateParam','6091','updateDatalink','2351','updateDatalink','9249','updateParam','3887','addModule','8430','updateParam','6499','updateParam','6077','updateDatalink','7428','updateDatalink','2695','updateParam','7102','updateParam','5067','updateParam','5071','updateDatalink','7734','addModule','3349','updateDatalink','8996','addModule','8379','updateDatalink','6669','addModule','2901','addModule','2868','addModule','6960','updateParam','3052','updateParam','7296','addModule','6575','updateParam','2381','updateParam','6022','addModule','6350','addModule','8544','updateParam','3064','updateParam','8464','addModule','5571','addModule','4401','updateParam','4201','addModule','6158','updateDatalink','6561','addModule','4623','addModule','8657','updateDatalink','9942','updateParam','4422','updateDatalink','3199','updateParam','8873','updateParam','2867','addModule','2164','updateParam','3278','updateDatalink','9779','updateDatalink','2350','addModule','2112','addModule','3835','addModule','4694','addModule','3334','updateDatalink','6307','addModule','3320','updateDatalink','8237','updateDatalink','2440','addModule','9919','updateParam','4317','updateParam','2228','addModule','7130','updateDatalink','3650','addModule','3202','updateDatalink','2601','addModule','5857','updateParam','9138','addModule','4793','addModule','7304','updateParam','3221','updateDatalink','3369','updateParam','6015','updateParam','9210','updateParam','8133','updateDatalink','4078','addModule','4551','updateParam','2018','addModule','6962','addModule','4159','updateDatalink','8496','updateParam','3165','addModule','9696','addModule','3066','updateDatalink','7019','updateDatalink','5729','updateParam','9097','updateDatalink','7226','updateDatalink','6016','updateParam','3335','updateParam','4859','updateParam','7441','addModule','8767','updateDatalink','8064','addModule','4763','updateParam','5295','addModule','5592','updateDatalink','5356','updateDatalink','2830','addModule','8561','updateParam','4506','updateDatalink'],
['5916','updateParam','6485','updateParam','3605','updateDatalink','6879','updateParam','2624','updateParam','8706','updateDatalink','8797','addModule','8086','updateDatalink','8440','updateParam','9183','addModule','8912','updateParam','7172','updateParam','7307','updateDatalink','4474','updateParam','2539','addModule','9499','updateParam','2061','updateDatalink','3162','addModule','2486','addModule','6409','updateDatalink','7336','addModule','2012','addModule','5189','updateDatalink','3877','updateParam','3468','updateDatalink','3123','updateParam','9114','updateDatalink','4168','addModule','3405','addModule','8089','updateDatalink','2166','updateParam','4492','addModule','8613','updateDatalink','5153','updateParam','6097','updateParam','4665','updateParam','5979','addModule','5364','updateParam','9906','updateParam','7759','updateParam','5719','addModule','7733','updateDatalink','8253','updateParam','5761','addModule','8284','addModule','5388','updateParam','8859','updateParam','6230','addModule','4269','addModule','8733','updateDatalink','8916','updateDatalink','3953','updateParam','7315','updateDatalink','5601','updateParam','4491','updateParam','9600','addModule','8016','addModule','2413','updateParam','8934','addModule','7382','updateDatalink','8829','updateParam','2334','updateDatalink','8283','addModule','9706','updateParam','3976','updateParam','8427','updateParam','5672','updateDatalink','8829','updateParam','8352','addModule','3810','updateDatalink','2733','updateDatalink','9521','updateParam','7431','updateParam','4815','addModule','6010','updateDatalink','6714','addModule','4174','addModule','3141','updateDatalink','2354','updateDatalink','4163','updateParam','2931','updateDatalink','5011','addModule','7343','addModule','2100','updateParam','2351','updateDatalink','7330','updateDatalink','2675','updateDatalink','9890','addModule','5287','addModule','6838','addModule','2584','updateDatalink','3689','updateDatalink','5704','addModule','2270','updateDatalink','9240','addModule','5098','addModule','8581','updateParam','5510','addModule','9159','updateDatalink','8823','updateParam'],
['2821','updateDatalink','5747','updateDatalink','2607','updateParam','7326','addModule','7156','updateParam','6633','addModule','2010','addModule','8487','addModule','5054','updateDatalink','8436','addModule','7354','addModule','6254','updateParam','8624','addModule','7201','updateDatalink','6596','updateDatalink','8304','updateParam','3522','updateParam','2901','updateDatalink','9070','addModule','8699','updateDatalink','6860','updateParam','8600','updateParam','7892','addModule','9540','addModule','6109','addModule','4600','updateDatalink','7363','updateDatalink','3624','updateParam','3007','updateParam','5607','updateDatalink','3385','addModule','6100','updateDatalink','2464','updateParam','8879','updateDatalink','4856','updateParam','7128','addModule','2471','updateDatalink','7389','updateParam','8082','updateParam','5530','updateParam','9004','addModule','3976','updateDatalink','4184','updateDatalink','3453','updateDatalink','3927','addModule','2504','updateParam','3503','addModule','2018','updateParam','9907','updateParam','8019','updateDatalink','5004','addModule','5981','updateDatalink','4313','updateParam','3901','addModule','6685','addModule','5389','updateDatalink','2122','updateDatalink','2026','updateDatalink','8983','updateParam','6235','updateDatalink','3832','addModule','5919','updateParam','3179','updateDatalink','6114','updateParam','8361','updateDatalink','6908','updateParam','8807','addModule','2878','addModule','2955','addModule','5287','addModule','8054','updateDatalink','4299','addModule','2100','updateDatalink','8465','updateDatalink','9175','updateDatalink','6715','addModule','7419','updateParam','6126','updateParam','6892','updateParam','6694','addModule','8584','addModule','2385','updateParam','7804','updateDatalink','5689','updateParam','9223','addModule','8946','updateDatalink','8793','addModule','7690','updateParam','5821','updateDatalink','7253','updateDatalink','8426','addModule','9886','updateDatalink','7634','addModule','7650','addModule','3370','updateDatalink','2317','addModule','9587','updateDatalink','5538','updateDatalink','9788','updateDatalink','8532','updateParam'],
['6186','updateDatalink','2529','addModule','5754','updateDatalink','7245','addModule','6421','updateParam','4604','addModule','2653','updateParam','6993','addModule','9676','addModule','5267','addModule','5591','updateParam','9787','addModule','6630','addModule','9705','updateDatalink','6799','updateParam','7776','updateDatalink','5168','updateParam','3937','updateDatalink','4042','updateParam','4895','updateDatalink','9285','addModule','4982','addModule','4022','updateDatalink','7529','updateParam','6991','addModule','8003','updateParam','2784','updateParam','8163','updateParam','7223','addModule','6472','updateDatalink','7129','updateDatalink','2040','updateDatalink','5741','addModule','5320','updateParam','9010','updateDatalink','4822','updateDatalink','8046','updateParam','3099','updateDatalink','8947','addModule','7239','updateParam','5278','addModule','7133','updateDatalink','8428','updateDatalink','2749','updateDatalink','7124','updateDatalink','9679','addModule','3318','addModule','8195','addModule','3727','updateParam','5078','addModule','2262','addModule','5458','addModule','8591','updateDatalink','7917','updateParam','6097','addModule','4117','updateParam','6482','updateParam','8182','addModule','4252','updateDatalink','9104','updateDatalink','6345','updateParam','7413','addModule','4157','addModule','5358','updateDatalink','7199','updateParam','7862','updateDatalink','5651','addModule','7484','updateDatalink','5052','updateDatalink','2651','updateDatalink','8386','addModule','6408','updateDatalink','8802','addModule','6925','updateDatalink','4232','addModule','5033','addModule','9144','updateParam','2011','updateDatalink','2687','updateDatalink','6899','updateDatalink','4479','updateDatalink','8571','updateDatalink','9281','updateDatalink','5831','updateDatalink','3816','updateDatalink','8762','addModule','4980','updateDatalink','8604','addModule','6684','updateParam','5389','updateParam','6599','updateDatalink','2594','addModule','8032','updateParam','2063','updateDatalink','8200','updateParam','4437','updateParam','4138','updateParam','8358','addModule','3504','updateParam','5682','updateDatalink'],
['7518','updateParam','5964','updateDatalink','9297','updateParam','7451','updateDatalink','6827','updateDatalink','3848','updateDatalink','9830','updateParam','8093','addModule','7768','addModule','6405','updateDatalink','6236','updateParam','7841','updateParam','3000','updateDatalink','6620','updateDatalink','2926','addModule','6468','updateParam','7041','updateDatalink','4219','updateParam','3000','updateDatalink','9943','addModule','4176','updateParam','8827','updateParam','4655','updateParam','6087','addModule','9363','updateParam','4127','updateDatalink','6586','updateDatalink','5231','updateParam','2136','addModule','9011','updateDatalink','6398','updateParam','9871','updateParam','5521','updateParam','3741','updateParam','8007','addModule','9323','updateParam','5930','updateParam','9103','addModule','6051','updateDatalink','7382','updateParam','2074','updateParam','6564','updateDatalink','3292','updateParam','2975','addModule','6870','updateParam','3428','updateParam','5025','updateDatalink','3822','addModule','2343','addModule','2991','updateDatalink','6484','addModule','9086','updateDatalink','7536','updateDatalink','7700','updateDatalink','5247','addModule','9034','updateParam','3414','addModule','7307','updateParam','6644','addModule','9693','addModule','2772','updateParam','8024','updateDatalink','6161','addModule','2503','updateDatalink','9141','updateDatalink','6685','updateDatalink','4847','updateParam','6976','addModule','8690','updateParam','5895','addModule','9723','addModule','2351','updateParam','3141','updateDatalink','6191','updateParam','3183','updateParam','4253','addModule','3666','updateParam','7198','updateDatalink','9408','updateParam','6345','updateParam','9799','addModule','9783','addModule','9761','updateDatalink','2987','updateDatalink','5341','updateParam','3211','updateDatalink','3205','addModule','4890','updateDatalink','3265','updateParam','9306','updateParam','3701','addModule','7776','addModule','3623','updateDatalink','7601','updateDatalink','6620','updateParam','2031','updateDatalink','8454','updateParam','5499','updateParam','4143','updateDatalink','7363','updateDatalink'],
['5685','updateDatalink','5426','addModule','9673','updateParam','4456','updateParam','2046','addModule','4989','updateDatalink','3239','updateParam','3630','updateParam','8967','addModule','6133','updateParam','5901','addModule','2492','updateParam','5488','updateDatalink','9296','updateDatalink','3158','updateDatalink','8599','updateDatalink','6171','addModule','8563','updateParam','5355','updateDatalink','7107','updateParam','9994','updateParam','3828','updateDatalink','5087','updateDatalink','9434','updateParam','6268','updateDatalink','5945','updateParam','7604','addModule','6910','updateParam','5539','updateDatalink','2886','updateParam','6224','addModule','5438','updateParam','7494','addModule','6899','updateParam','6730','updateParam','5149','updateParam','9868','updateDatalink','6661','addModule','4786','updateDatalink','5057','addModule','2349','updateParam','8436','addModule','4333','updateDatalink','8715','updateDatalink','9489','addModule','6233','updateDatalink','5004','updateDatalink','6875','addModule','6602','updateParam','8959','updateParam','6527','updateDatalink','9139','updateParam','4678','updateDatalink','4576','updateParam','6127','updateDatalink','4618','addModule','8284','updateDatalink','5258','addModule','4941','updateDatalink','3591','addModule','6474','addModule','5550','updateParam','7417','addModule','8154','updateParam','4693','updateDatalink','5518','addModule','5723','updateDatalink','7883','updateDatalink','9684','updateDatalink','2910','updateParam','5152','updateDatalink','8488','addModule','7393','addModule','2311','addModule','2532','updateParam','5468','updateDatalink','5879','updateParam','9299','updateDatalink','5628','updateDatalink','6768','addModule','7214','updateParam','9602','updateDatalink','5547','addModule','8438','updateParam','4395','updateDatalink','5252','addModule','6152','addModule','3284','updateDatalink','3250','updateDatalink','3744','updateDatalink','6460','updateDatalink','6528','updateParam','5337','updateDatalink','8193','updateParam','8052','updateParam','2463','updateParam','7862','updateDatalink','8486','updateDatalink','7479','updateDatalink','4111','addModule'],
['4573','updateDatalink','5439','updateDatalink','5667','updateDatalink','9876','updateDatalink','3676','updateParam','3960','addModule','2327','updateParam','9203','addModule','6735','updateParam','7196','updateParam','7356','updateParam','5232','addModule','4584','updateDatalink','3695','addModule','5245','updateParam','6458','addModule','6225','addModule','3560','updateDatalink','8489','updateDatalink','3383','updateParam','4743','updateParam','3607','updateDatalink','7988','updateDatalink','2174','addModule','8207','updateDatalink','9520','updateParam','4455','addModule','3320','updateParam','7578','updateParam','3005','updateParam','8826','updateDatalink','5286','addModule','9613','addModule','5952','updateDatalink','3658','updateDatalink','9174','addModule','6775','addModule','9587','updateDatalink','9545','updateDatalink','8373','updateParam','4138','addModule','8627','updateDatalink','8517','updateDatalink','3220','updateDatalink','7290','updateParam','4441','addModule','4449','addModule','8652','updateParam','3245','updateDatalink','9203','updateParam','4466','updateParam','6869','addModule','6343','addModule','3049','updateDatalink','9353','addModule','4982','updateParam','9162','addModule','4231','addModule','4956','updateDatalink','5676','addModule','6419','updateParam','4279','addModule','2592','updateDatalink','2862','updateParam','3882','updateParam','8152','updateParam','8454','updateParam','2336','updateDatalink','4270','updateParam','3394','addModule','2015','updateParam','3432','addModule','2164','updateParam','2295','addModule','3439','updateDatalink','5683','updateDatalink','3911','updateDatalink','5044','updateParam','5985','addModule','8473','updateParam','8533','addModule','3885','updateDatalink','5412','updateParam','3695','updateDatalink','5627','updateParam','4273','updateParam','6384','updateDatalink','9406','addModule','6279','updateDatalink','7032','addModule','5883','addModule','8486','updateDatalink','2965','updateParam','7512','updateDatalink','9607','addModule','8292','addModule','2458','addModule','3741','updateDatalink','9381','updateDatalink','5314','updateDatalink'],
['3738','updateParam','5585','updateParam','9564','updateParam','6834','updateParam','8892','addModule','4904','addModule','6452','addModule','5577','updateParam','3025','updateDatalink','2707','updateDatalink','8684','updateDatalink','3374','updateDatalink','7167','updateDatalink','5307','updateDatalink','2653','addModule','3813','addModule','4173','updateParam','5482','updateDatalink','6909','addModule','5898','addModule','9637','addModule','4625','updateParam','7562','addModule','6702','addModule','7792','updateDatalink','3905','addModule','6697','addModule','5028','addModule','8420','updateDatalink','4422','updateParam','7769','updateParam','6062','addModule','8757','updateDatalink','8363','updateDatalink','2021','updateParam','3030','updateDatalink','4399','updateParam','5157','updateParam','3881','updateDatalink','7854','updateParam','9210','updateDatalink','6632','updateDatalink','7372','addModule','2809','addModule','4226','addModule','3174','addModule','7520','addModule','5178','addModule','7560','updateParam','8880','updateDatalink','6755','updateDatalink','4911','updateParam','9314','updateParam','3713','addModule','6324','addModule','7277','addModule','3479','updateDatalink','4663','updateParam','6691','updateDatalink','4524','updateParam','4845','addModule','9901','addModule','8946','addModule','4532','updateDatalink','2905','updateParam','7932','updateParam','9214','updateParam','4474','updateDatalink','4765','addModule','3756','updateDatalink','2056','updateParam','5466','updateDatalink','7044','updateParam','6024','updateDatalink','8879','updateParam','4230','updateParam','8787','addModule','7189','addModule','3339','updateDatalink','9743','addModule','9365','updateParam','4669','addModule','5752','addModule','4899','addModule','7388','updateDatalink','6999','addModule','2495','addModule','5165','addModule','8604','addModule','8989','updateParam','2416','updateParam','6233','updateParam','2811','addModule','7878','updateParam','6240','updateDatalink','4679','updateParam','5762','addModule','4493','addModule','8971','updateDatalink','3619','addModule']
];

  var INSTRUCTIONS_PER_COLLABORATOR = 25;








  //Collaborator Threads
var numOfDoneCollabs = 0;
var nextNumOfCollab = 1;








//Workflow Construction
 //Workflow Construction
  var workflow = new Tree('n1');


workflow.add('n2', 'n1', workflow.traverseDF);
workflow.add('n3', 'n2', workflow.traverseDF);
workflow.add('n4', 'n3', workflow.traverseDF);
workflow.add('n5', 'n4', workflow.traverseDF);
workflow.add('n6', 'n5', workflow.traverseDF);
workflow.add('n7', 'n6', workflow.traverseDF);
workflow.add('n8', 'n7', workflow.traverseDF);
workflow.add('n9', 'n8', workflow.traverseDF);
workflow.add('n10', 'n9', workflow.traverseDF);
workflow.add('n11', 'n10', workflow.traverseDF);
workflow.add('n12', 'n11', workflow.traverseDF);
workflow.add('n13', 'n12', workflow.traverseDF);
workflow.add('n14', 'n13', workflow.traverseDF);
workflow.add('n15', 'n14', workflow.traverseDF);
workflow.add('n16', 'n15', workflow.traverseDF);
workflow.add('n17', 'n16', workflow.traverseDF);
workflow.add('n18', 'n17', workflow.traverseDF);
workflow.add('n19', 'n18', workflow.traverseDF);
workflow.add('n20', 'n19', workflow.traverseDF);
workflow.add('n21', 'n20', workflow.traverseDF);
workflow.add('n22', 'n21', workflow.traverseDF);
workflow.add('n23', 'n22', workflow.traverseDF);
workflow.add('n24', 'n23', workflow.traverseDF);
workflow.add('n25', 'n24', workflow.traverseDF);


var NUM_OF_MODULES = 25;







//============
//Class Definition
//============
function WorkflowCollaborator(collaboratorID, nextInstructionSerial) {
  this.collaboratorID = collaboratorID;
  this.nextInstructionSerial = nextInstructionSerial;
  this.isAccessRequestedAlready = false;
}


//helper function for checking the total number of node access available to this collaborator
WorkflowCollaborator.prototype.getCountsOfMyAccessNode = function(){
    var nodeCount = 0;
    for(var i=0; i<grantedNodeAccesses.length; i++){
        if(grantedNodeAccesses[i]["collaboratorID"] == this.collaboratorID)nodeCount++;
    }

    return nodeCount;
};



WorkflowCollaborator.prototype.removeAllMyAccessedNodes = function(){
    for(var i=0; i<grantedNodeAccesses.length; i++){
        //I had the access to this node
        if(grantedNodeAccesses[i]["collaboratorID"] == this.collaboratorID){
            //release access to this node and its descendants
            releaseNodeAccess(this.collaboratorID, grantedNodeAccesses[i]["node"]);
        }
    }

    //print_list(grantedNodeAccesses, "NEW GRANT LIST");
};


WorkflowCollaborator.prototype.getAllMyAccessedNodes = function(){
    var myNodes = "";
    for(var i=0; i<grantedNodeAccesses.length; i++){
        //I had the access to this node
        if(grantedNodeAccesses[i]["collaboratorID"] == this.collaboratorID){
        //add this node to the list
        myNodes += grantedNodeAccesses[i]["node"];

        }
    }

    return myNodes;

};



//returns the node with higher Dependency degree that has not been user locked yet
WorkflowCollaborator.prototype.getNodeWithHigherDependencyDegree_exceptUserLockedNode = function(){
    var theNode = "n1";//by default the root node, as it has the most dependency degree

    for(var i=1;i<=NUM_OF_MODULES;i++){
        if(isTheNodeInThisList(grantedNodeAccesses,"n"+i.toString()) == false){
            theNode = "n"+i.toString();
            break;
        }
    }

    return theNode;

};

//returns the node with the higher dependency degree which has not been user locked or requested (waiting)
//by any other collaborators
WorkflowCollaborator.prototype.getNodeWithHigherDependencyDegree_exceptUserLockedAndWaitingNodes = function(){
    var combinedList = grantedNodeAccesses.concat(waitingNodeAccessRequests);

    var theNode = "n1";//by default the root node, as it has the most dependency degree in case all node has been taken

    //iterate from higher to lower dependency degree
    for(var i=1; i<=NUM_OF_MODULES; i++){
        if(isTheNodeInThisList(combinedList, "n"+i.toString()) == false){
            theNode = "n"+i.toString();
            break;
        }
    }

    return theNode;

};



//returns the node with lower Dependency degree that has not been user locked yet
WorkflowCollaborator.prototype.getNodeWithLowerDependencyDegree_exceptUserLockedNode = function(){
    var theNode = "n" + NUM_OF_MODULES.toString();//by default a leaf node, as it has the least dependency degree

    for(var i=NUM_OF_MODULES;i>=1;i--){
        if(isTheNodeInThisList(grantedNodeAccesses,"n"+i.toString()) == false){
            theNode = "n"+i.toString();
            break;
        }
    }

    return theNode;

};



//returns the node with the lower dependency degree which has not been user locked or requested (waiting)
//by any other collaborators
WorkflowCollaborator.prototype.getNodeWithLowerDependencyDegree_exceptUserLockedAndWaitingNodes = function(){
    var combinedList = grantedNodeAccesses.concat(waitingNodeAccessRequests);

    var theNode = "n"+NUM_OF_MODULES.toString();//by default a leaf node, as it has the least dependency degree in case all node has been taken

    //iterate from lower to higher dependency degree
    for(var i=NUM_OF_MODULES;i>=1;i--){
        if(isTheNodeInThisList(combinedList, "n"+i.toString()) == false){
            theNode = "n"+i.toString();
            break;
        }
    }

    return theNode;

};





WorkflowCollaborator.prototype.simulate = function() {
    //do I have any instruction left to exec.
    if(this.nextInstructionSerial <= INSTRUCTIONS_PER_COLLABORATOR){
        //I have access to at least one sub-workflow
        if(this.getCountsOfMyAccessNode()>0){
            //console.log("Node Counts : " + this.getCountsOfMyAccessNode() + " (Nodes: " + this.getAllMyAccessedNodes()+" )");
            if(this.nextInstructionSerial%2 == 0){//this phase is my thinking time
                var thinkingTime = workflow_instructions[this.collaboratorID][this.nextInstructionSerial];

                if(thinkingTime >= 5000){//if thinking time is too much, release floor for others
                    this.nextInstructionSerial++;
                    console.log("NODEACCESSRELEASED" + "_" + this.collaboratorID);
                    this.isAccessRequestedAlready = false;
                    this.removeAllMyAccessedNodes();
                    var me = this;
                    setTimeout(function() {
                      me.simulate();
                    }, 1000);

                }else{//thinking time is short, wont release the floor
                    this.nextInstructionSerial++;
                    console.log("THINKING" + "_" + this.collaboratorID);
                    var me = this;
                    setTimeout(function() {
                      me.simulate();
                    }, thinkingTime);
                }

            }else{//this phase is update time
                  console.log("UPDATE" + "_" + this.collaboratorID );
                  this.nextInstructionSerial++; //lets try to move for next instruction
                  var me = this;
                  setTimeout(function() {
                    me.simulate();
                  }, 100);
            }


        }else{//I dont have any access, so request for it
            if(this.isAccessRequestedAlready == false){//not requested yet..?, request access
                this.isAccessRequestedAlready = true;
                console.log("NODEACCESSREQUESTED"+ "_" + this.collaboratorID);

                //=====================
                //Different protocols for node access request for the simulation
                //uncomment as per the requirement
                //=====================
                //newNodeAccessRequest(this.collaboratorID, "n1");//always requesting n1 (should behave as floor request), for testing
                //newNodeAccessRequest(this.collaboratorID, this.getNodeWithHigherDependencyDegree_exceptUserLockedNode());//worst case, request always higher dependency degree
                //newNodeAccessRequest(this.collaboratorID, this.getNodeWithHigherDependencyDegree_exceptUserLockedAndWaitingNodes());
                newNodeAccessRequest(this.collaboratorID, this.getNodeWithLowerDependencyDegree_exceptUserLockedNode());
                //newNodeAccessRequest(this.collaboratorID, this.getNodeWithLowerDependencyDegree_exceptUserLockedAndWaitingNodes());

                var me = this;
                setTimeout(function() {
                    me.simulate();
                }, 1000);

            }else{//already requested node access
                console.log("WAITING"+ "_" + this.collaboratorID);
                //keep checking if I have got the floor
                var me = this;
                setTimeout(function() {
                    me.simulate();
                }, 1000);
            }

        }

    }else{//done with executing all the instructions
        console.log("END"+ "_" + this.collaboratorID);
        this.removeAllMyAccessedNodes();


        numOfDoneCollabs++;

        if(numOfDoneCollabs == nextNumOfCollab-1){
            numOfDoneCollabs = 0;

            if(nextNumOfCollab >2){
                alert("Done : " + nextNumOfCollab);
            }else{
                run_simulation_steps(nextNumOfCollab);
                nextNumOfCollab++;
            }

      }


    }


};









console.log("Tasks: 25; Collaborators: 1");
var c0 = new WorkflowCollaborator(0, 0);
c0.simulate();
nextNumOfCollab++;


function run_simulation_steps(nCollabs){
    if(nCollabs==1){
       console.log("Tasks: 25; Collaborators: 1    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       c0.simulate();
    }
    if(nCollabs==2){
       console.log("Tasks: 25; Collaborators: 2    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       c0.simulate();
       c1.simulate();
    }
    if(nCollabs==3){
       console.log("Tasks: 25; Collaborators: 3    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
    }
    if(nCollabs==4){
       console.log("Tasks: 25; Collaborators: 4    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
    }
    if(nCollabs==5){
       console.log("Tasks: 25; Collaborators: 5    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
    }
    if(nCollabs==6){
       console.log("Tasks: 25; Collaborators: 6    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
    }
    if(nCollabs==7){
       console.log("Tasks: 25; Collaborators: 7    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
    }
    if(nCollabs==8){
       console.log("Tasks: 25; Collaborators: 8    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
    }
    if(nCollabs==9){
       console.log("Tasks: 25; Collaborators: 9    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
    }
    if(nCollabs==10){
       console.log("Tasks: 25; Collaborators: 10    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
    }
    if(nCollabs==11){
       console.log("Tasks: 25; Collaborators: 11    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
    }
    if(nCollabs==12){
       console.log("Tasks: 25; Collaborators: 12    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
    }
    if(nCollabs==13){
       console.log("Tasks: 25; Collaborators: 13    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
    }
    if(nCollabs==14){
       console.log("Tasks: 25; Collaborators: 14    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
    }
    if(nCollabs==15){
       console.log("Tasks: 25; Collaborators: 15    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
    }
    if(nCollabs==16){
       console.log("Tasks: 25; Collaborators: 16    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
    }
    if(nCollabs==17){
       console.log("Tasks: 25; Collaborators: 17    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
    }
    if(nCollabs==18){
       console.log("Tasks: 25; Collaborators: 18    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
    }
    if(nCollabs==19){
       console.log("Tasks: 25; Collaborators: 19    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
    }
    if(nCollabs==20){
       console.log("Tasks: 25; Collaborators: 20    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
    }
    if(nCollabs==21){
       console.log("Tasks: 25; Collaborators: 21    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
    }
    if(nCollabs==22){
       console.log("Tasks: 25; Collaborators: 22    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
    }
    if(nCollabs==23){
       console.log("Tasks: 25; Collaborators: 23    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
    }
    if(nCollabs==24){
       console.log("Tasks: 25; Collaborators: 24    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
    }
    if(nCollabs==25){
       console.log("Tasks: 25; Collaborators: 25    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       var c24 = new WorkflowCollaborator(24, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
       c24.simulate();
    }
    if(nCollabs==26){
       console.log("Tasks: 25; Collaborators: 26    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       var c24 = new WorkflowCollaborator(24, 0);
       var c25 = new WorkflowCollaborator(25, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
       c24.simulate();
       c25.simulate();
    }
    if(nCollabs==27){
       console.log("Tasks: 25; Collaborators: 27    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       var c24 = new WorkflowCollaborator(24, 0);
       var c25 = new WorkflowCollaborator(25, 0);
       var c26 = new WorkflowCollaborator(26, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
       c24.simulate();
       c25.simulate();
       c26.simulate();
    }
    if(nCollabs==28){
       console.log("Tasks: 25; Collaborators: 28    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       var c24 = new WorkflowCollaborator(24, 0);
       var c25 = new WorkflowCollaborator(25, 0);
       var c26 = new WorkflowCollaborator(26, 0);
       var c27 = new WorkflowCollaborator(27, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
       c24.simulate();
       c25.simulate();
       c26.simulate();
       c27.simulate();
    }
    if(nCollabs==29){
       console.log("Tasks: 25; Collaborators: 29    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       var c24 = new WorkflowCollaborator(24, 0);
       var c25 = new WorkflowCollaborator(25, 0);
       var c26 = new WorkflowCollaborator(26, 0);
       var c27 = new WorkflowCollaborator(27, 0);
       var c28 = new WorkflowCollaborator(28, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
       c24.simulate();
       c25.simulate();
       c26.simulate();
       c27.simulate();
       c28.simulate();
    }
    if(nCollabs==30){
       console.log("Tasks: 25; Collaborators: 30    =========================>");
       var c0 = new WorkflowCollaborator(0, 0);
       var c1 = new WorkflowCollaborator(1, 0);
       var c2 = new WorkflowCollaborator(2, 0);
       var c3 = new WorkflowCollaborator(3, 0);
       var c4 = new WorkflowCollaborator(4, 0);
       var c5 = new WorkflowCollaborator(5, 0);
       var c6 = new WorkflowCollaborator(6, 0);
       var c7 = new WorkflowCollaborator(7, 0);
       var c8 = new WorkflowCollaborator(8, 0);
       var c9 = new WorkflowCollaborator(9, 0);
       var c10 = new WorkflowCollaborator(10, 0);
       var c11 = new WorkflowCollaborator(11, 0);
       var c12 = new WorkflowCollaborator(12, 0);
       var c13 = new WorkflowCollaborator(13, 0);
       var c14 = new WorkflowCollaborator(14, 0);
       var c15 = new WorkflowCollaborator(15, 0);
       var c16 = new WorkflowCollaborator(16, 0);
       var c17 = new WorkflowCollaborator(17, 0);
       var c18 = new WorkflowCollaborator(18, 0);
       var c19 = new WorkflowCollaborator(19, 0);
       var c20 = new WorkflowCollaborator(20, 0);
       var c21 = new WorkflowCollaborator(21, 0);
       var c22 = new WorkflowCollaborator(22, 0);
       var c23 = new WorkflowCollaborator(23, 0);
       var c24 = new WorkflowCollaborator(24, 0);
       var c25 = new WorkflowCollaborator(25, 0);
       var c26 = new WorkflowCollaborator(26, 0);
       var c27 = new WorkflowCollaborator(27, 0);
       var c28 = new WorkflowCollaborator(28, 0);
       var c29 = new WorkflowCollaborator(29, 0);
       c0.simulate();
       c1.simulate();
       c2.simulate();
       c3.simulate();
       c4.simulate();
       c5.simulate();
       c6.simulate();
       c7.simulate();
       c8.simulate();
       c9.simulate();
       c10.simulate();
       c11.simulate();
       c12.simulate();
       c13.simulate();
       c14.simulate();
       c15.simulate();
       c16.simulate();
       c17.simulate();
       c18.simulate();
       c19.simulate();
       c20.simulate();
       c21.simulate();
       c22.simulate();
       c23.simulate();
       c24.simulate();
       c25.simulate();
       c26.simulate();
       c27.simulate();
       c28.simulate();
       c29.simulate();
    }

}













//Testing

function print_list(theList, listName) {
  console.log("PRINTING : " + listName + " ====> ");

  for (var i = 0; i < theList.length; i++) {
    console.log("collab: " + theList[i]["collaboratorID"] + " node:" + theList[i]["node"]);
  }
}



//collaborators
/*var c0 = new WorkflowCollaborator(0,0);
var c1 = new WorkflowCollaborator(1,0);
var c2 = new WorkflowCollaborator(2,0);
var c3 = new WorkflowCollaborator(3,0);
var c4 = new WorkflowCollaborator(4,0);

c0.simulate();
c1.simulate();
c2.simulate();
c3.simulate();
c4.simulate();*/



/*
print_list(grantedNodeAccesses, "Granted List");
print_list(waitingNodeAccessRequests, "Waiting List");


newNodeAccessRequest("c1", "n1");
newNodeAccessRequest("c2", "n2");


print_list(grantedNodeAccesses, "Granted List");
print_list(waitingNodeAccessRequests, "Waiting List");

newNodeAccessRequest("c3", "n3");

print_list(grantedNodeAccesses, "Granted List");
print_list(waitingNodeAccessRequests, "Waiting List");

releaseNodeAccess("c1", "n1");

print_list(grantedNodeAccesses, "Granted List");
print_list(waitingNodeAccessRequests, "Waiting List");
*/




















