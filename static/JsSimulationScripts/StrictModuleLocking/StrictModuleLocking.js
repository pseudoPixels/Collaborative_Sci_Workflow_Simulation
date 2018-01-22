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






//Workflow Simulation Instructions
//upto 10 collaborators... each 100 instructions
var workflow_instructions = [
    ['5953', 'addModule', '6991', 'addModule', '8732', 'updateDatalink', '9887', 'addModule', '6847', 'updateParam', '9005', 'updateDatalink', '7692', 'addModule', '8226', 'updateParam', '2362', 'updateDatalink', '4907', 'updateDatalink', '8343', 'addModule', '8001', 'updateParam', '2638', 'updateDatalink', '6265', 'updateParam', '5606', 'addModule', '4795', 'updateDatalink', '3756', 'addModule', '4130', 'addModule', '3733', 'updateDatalink', '8193', 'updateDatalink', '9772', 'addModule', '7311', 'addModule', '8840', 'addModule', '6555', 'updateParam', '3745', 'addModule', '5665', 'updateParam', '2439', 'addModule', '8801', 'updateDatalink', '3774', 'addModule', '2372', 'updateParam', '7969', 'updateParam', '3193', 'addModule', '4021', 'updateParam', '3220', 'addModule', '2327', 'updateParam', '9113', 'updateParam', '8750', 'updateDatalink', '2882', 'updateParam', '8398', 'updateParam', '5849', 'updateParam', '7351', 'updateDatalink', '8204', 'addModule', '8590', 'updateParam', '2373', 'updateParam', '2379', 'updateDatalink', '2478', 'addModule', '7360', 'updateParam', '8120', 'addModule', '2580', 'updateParam', '2731', 'addModule', '2749', 'updateParam', '8774', 'updateParam', '4924', 'updateDatalink', '2000', 'addModule', '2914', 'updateParam', '3049', 'updateDatalink', '5634', 'updateDatalink', '4618', 'updateDatalink', '7656', 'addModule', '4467', 'updateDatalink', '8221', 'updateDatalink', '2492', 'addModule', '2951', 'updateParam', '8140', 'addModule', '4513', 'addModule', '4385', 'updateParam', '8487', 'addModule', '2552', 'updateParam', '8687', 'updateParam', '6200', 'addModule', '2187', 'updateDatalink', '2344', 'addModule', '8299', 'updateParam', '6255', 'updateDatalink', '9749', 'updateDatalink', '6086', 'addModule', '8316', 'updateParam', '9572', 'updateParam', '7168', 'addModule', '7068', 'updateDatalink', '8149', 'addModule', '5153', 'addModule', '4276', 'updateDatalink', '9075', 'updateDatalink', '7681', 'addModule', '4263', 'updateDatalink', '5266', 'updateParam', '7172', 'updateParam', '2301', 'addModule', '3709', 'updateDatalink', '6230', 'addModule', '5481', 'updateParam', '6933', 'updateParam', '2126', 'updateParam', '5684', 'updateParam', '7968', 'updateDatalink', '5069', 'updateDatalink', '5255', 'updateDatalink', '4103', 'addModule', '6219', 'updateDatalink'],
    ['5698', 'addModule', '2240', 'addModule', '6484', 'updateDatalink', '5599', 'updateDatalink', '5841', 'addModule', '9069', 'updateParam', '7929', 'addModule', '9624', 'updateDatalink', '5352', 'addModule', '7367', 'updateDatalink', '7020', 'updateParam', '2276', 'updateDatalink', '2837', 'addModule', '6400', 'addModule', '3467', 'updateParam', '3757', 'addModule', '9430', 'updateDatalink', '2190', 'addModule', '7774', 'addModule', '5416', 'addModule', '2575', 'updateDatalink', '9544', 'updateParam', '9520', 'updateDatalink', '4278', 'updateDatalink', '4807', 'addModule', '3087', 'addModule', '6640', 'addModule', '2573', 'addModule', '7533', 'addModule', '7293', 'updateDatalink', '7707', 'addModule', '4276', 'updateDatalink', '3811', 'updateDatalink', '7514', 'addModule', '7215', 'addModule', '8629', 'updateDatalink', '2139', 'addModule', '2015', 'addModule', '5856', 'updateDatalink', '8674', 'addModule', '5225', 'updateDatalink', '3003', 'addModule', '3802', 'updateDatalink', '2790', 'updateDatalink', '9777', 'addModule', '2659', 'updateParam', '6991', 'addModule', '3218', 'updateParam', '3282', 'updateDatalink', '8167', 'updateParam', '6404', 'addModule', '9596', 'updateParam', '5784', 'addModule', '9750', 'addModule', '2345', 'addModule', '3486', 'addModule', '4670', 'updateDatalink', '9695', 'addModule', '9728', 'updateDatalink', '3911', 'addModule', '6448', 'updateDatalink', '8391', 'updateDatalink', '4352', 'addModule', '7882', 'addModule', '5530', 'addModule', '3355', 'updateDatalink', '2185', 'updateParam', '7931', 'updateParam', '6012', 'addModule', '9266', 'addModule', '7647', 'updateDatalink', '6639', 'updateDatalink', '8456', 'updateDatalink', '2993', 'updateDatalink', '6889', 'updateParam', '4174', 'updateParam', '9672', 'updateDatalink', '9632', 'updateDatalink', '6072', 'updateParam', '6817', 'updateParam', '7496', 'updateParam', '9533', 'updateDatalink', '2655', 'updateParam', '8493', 'updateDatalink', '2575', 'addModule', '2330', 'updateDatalink', '9670', 'updateParam', '9306', 'updateParam', '5149', 'updateDatalink', '3977', 'addModule', '5004', 'addModule', '7065', 'addModule', '6825', 'updateParam', '8775', 'addModule', '5686', 'updateParam', '9821', 'updateParam', '5368', 'updateDatalink', '4405', 'addModule', '3159', 'updateParam', '5395', 'updateParam'],
    ['5443', 'addModule', '5489', 'addModule', '4236', 'addModule', '9311', 'updateDatalink', '4835', 'updateDatalink', '9134', 'updateParam', '8167', 'updateDatalink', '3021', 'addModule', '8342', 'updateParam', '9827', 'updateParam', '5697', 'updateDatalink', '4551', 'addModule', '3036', 'updateParam', '6534', 'updateParam', '9328', 'updateDatalink', '2719', 'updateDatalink', '7105', 'addModule', '8250', 'updateDatalink', '3815', 'updateParam', '2639', 'updateDatalink', '3379', 'updateParam', '3777', 'updateParam', '2199', 'addModule', '2000', 'updateDatalink', '5869', 'updateDatalink', '8509', 'addModule', '2840', 'addModule', '4346', 'addModule', '3291', 'addModule', '4213', 'updateDatalink', '7446', 'updateParam', '5360', 'addModule', '3602', 'updateParam', '3808', 'updateDatalink', '4104', 'addModule', '8143', 'updateParam', '3528', 'updateParam', '9148', 'addModule', '3313', 'updateDatalink', '3498', 'addModule', '3098', 'updateParam', '5803', 'updateParam', '7015', 'updateDatalink', '3208', 'updateParam', '9175', 'addModule', '2839', 'updateDatalink', '6623', 'updateDatalink', '6318', 'updateParam', '3982', 'addModule', '5603', 'updateParam', '2058', 'updateParam', '2418', 'updateParam', '6643', 'updateParam', '9499', 'addModule', '9777', 'addModule', '3924', 'addModule', '3705', 'updateParam', '6772', 'updateDatalink', '3801', 'updateParam', '3356', 'updateParam', '4675', 'updateDatalink', '6290', 'updateParam', '5752', 'updateParam', '7625', 'updateDatalink', '6546', 'addModule', '2324', 'addModule', '3884', 'updateParam', '5308', 'updateParam', '3337', 'updateParam', '4331', 'updateParam', '5107', 'updateParam', '2934', 'updateDatalink', '8613', 'updateParam', '7731', 'addModule', '4029', 'addModule', '2263', 'addModule', '3027', 'updateParam', '9693', 'updateDatalink', '4976', 'updateParam', '6567', 'updateDatalink', '6842', 'updateParam', '5912', 'updateParam', '9035', 'updateParam', '7911', 'updateParam', '5469', 'updateDatalink', '8398', 'updateParam', '6073', 'updateParam', '3439', 'updateDatalink', '7996', 'updateParam', '4245', 'addModule', '3778', 'addModule', '8648', 'updateParam', '6717', 'updateParam', '7423', 'updateParam', '5688', 'addModule', '3674', 'addModule', '5668', 'updateParam', '3556', 'addModule', '2216', 'addModule', '4572', 'updateDatalink'],
    ['5188', 'addModule', '8738', 'updateParam', '9988', 'addModule', '5023', 'updateDatalink', '3829', 'updateDatalink', '9198', 'addModule', '8405', 'updateDatalink', '4419', 'updateParam', '3332', 'updateDatalink', '4286', 'addModule', '4375', 'addModule', '6826', 'updateParam', '3236', 'updateParam', '6668', 'addModule', '7189', 'updateParam', '9682', 'updateParam', '4779', 'addModule', '6310', 'updateDatalink', '7856', 'addModule', '7863', 'updateDatalink', '4183', 'addModule', '6009', 'updateParam', '2878', 'updateParam', '7723', 'updateParam', '6930', 'addModule', '5931', 'updateDatalink', '7041', 'updateParam', '6119', 'updateParam', '7049', 'updateDatalink', '9133', 'addModule', '7184', 'updateDatalink', '6444', 'addModule', '3392', 'updateDatalink', '8102', 'addModule', '8993', 'updateDatalink', '7659', 'updateDatalink', '4917', 'updateDatalink', '8280', 'addModule', '8771', 'updateDatalink', '6323', 'addModule', '8972', 'updateParam', '8602', 'updateDatalink', '2227', 'updateDatalink', '3625', 'updateParam', '8572', 'addModule', '3020', 'updateDatalink', '6255', 'addModule', '9417', 'updateParam', '4684', 'updateParam', '3039', 'updateParam', '5713', 'addModule', '3240', 'addModule', '7503', 'updateDatalink', '9248', 'addModule', '9208', 'updateDatalink', '4361', 'updateDatalink', '2741', 'updateParam', '3848', 'updateParam', '5873', 'addModule', '2801', 'addModule', '2901', 'updateDatalink', '4189', 'updateParam', '7153', 'updateDatalink', '7368', 'updateDatalink', '7563', 'addModule', '9294', 'updateParam', '5582', 'addModule', '2687', 'addModule', '8662', 'addModule', '7397', 'updateParam', '2567', 'updateDatalink', '7230', 'updateParam', '8770', 'updateDatalink', '4469', 'updateDatalink', '9169', 'updateParam', '8352', 'updateParam', '4382', 'updateDatalink', '9753', 'updateDatalink', '3880', 'updateDatalink', '6316', 'addModule', '6188', 'updateDatalink', '2292', 'updateDatalink', '7414', 'updateDatalink', '7329', 'updateParam', '8363', 'updateDatalink', '6465', 'addModule', '2476', 'updateParam', '5573', 'updateParam', '2843', 'updateParam', '4513', 'updateParam', '2552', 'addModule', '2231', 'updateParam', '6610', 'updateParam', '6072', 'addModule', '5690', 'addModule', '5527', 'addModule', '5967', 'addModule', '2706', 'updateParam', '9273', 'updateParam', '3748', 'updateDatalink'],
    ['2180', 'addModule', '7737', 'updateParam', '9657', 'updateDatalink', '7305', 'updateDatalink', '7821', 'updateParam', '9284', 'updateParam', '8722', 'addModule', '6282', 'updateParam', '7319', 'addModule', '2233', 'updateDatalink', '2611', 'updateDatalink', '4527', 'addModule', '8835', 'updateDatalink', '6848', 'updateDatalink', '7004', 'updateDatalink', '2964', 'addModule', '7012', 'updateDatalink', '3723', 'updateDatalink', '2577', 'updateDatalink', '9494', 'updateParam', '5254', 'updateParam', '6320', 'updateParam', '3784', 'addModule', '2020', 'updateParam', '3012', 'updateDatalink', '2493', 'updateParam', '4641', 'updateParam', '8482', 'updateParam', '4060', 'addModule', '5027', 'updateDatalink', '9502', 'addModule', '7888', 'updateDatalink', '5778', 'updateParam', '3161', 'updateDatalink', '4844', 'updateDatalink', '4345', 'updateDatalink', '9436', 'updateParam', '7124', 'updateDatalink', '8047', 'addModule', '2088', 'addModule', '3470', 'updateParam', '9668', 'updateDatalink', '9177', 'updateDatalink', '9515', 'updateDatalink', '7769', 'updateParam', '8594', 'addModule', '5764', 'addModule', '8216', 'addModule', '2952', 'updateParam', '2287', 'addModule', '2586', 'updateParam', '7002', 'updateParam', '8650', 'addModule', '6246', 'updateParam', '8449', 'addModule', '4944', 'updateParam', '6789', 'updateDatalink', '2617', 'updateDatalink', '5970', 'updateParam', '7394', 'updateDatalink', '5870', 'updateParam', '6721', 'updateDatalink', '6354', 'updateParam', '7025', 'updateParam', '6252', 'addModule', '2587', 'updateParam', '5180', 'updateDatalink', '9858', 'updateParam', '2428', 'updateDatalink', '3485', 'updateParam', '7181', 'updateParam', '2291', 'addModule', '6314', 'updateDatalink', '5453', 'updateParam', '8022', 'addModule', '3136', 'updateDatalink', '3522', 'addModule', '9833', 'addModule', '5086', 'addModule', '8648', 'addModule', '2650', 'updateDatalink', '2798', 'updateParam', '5253', 'updateParam', '6554', 'updateDatalink', '9555', 'updateParam', '3888', 'addModule', '5680', 'updateParam', '3084', 'updateDatalink', '6640', 'updateParam', '7536', 'updateParam', '3585', 'addModule', '7009', 'updateParam', '9132', 'updateDatalink', '9603', 'addModule', '3025', 'updateParam', '2664', 'addModule', '6366', 'updateParam', '6907', 'updateDatalink', '2681', 'updateParam', '7983', 'updateParam'],
    ['9925', 'addModule', '2986', 'updateDatalink', '7410', 'addModule', '3017', 'updateParam', '6815', 'addModule', '9349', 'updateParam', '8960', 'addModule', '7680', 'updateDatalink', '2309', 'updateParam', '4693', 'updateParam', '9288', 'addModule', '6802', 'updateParam', '9035', 'addModule', '6982', 'addModule', '4865', 'addModule', '9926', 'updateDatalink', '4686', 'updateDatalink', '9783', 'updateDatalink', '6618', 'updateParam', '6717', 'updateParam', '6058', 'updateParam', '8552', 'updateParam', '4464', 'addModule', '7742', 'updateDatalink', '4074', 'updateDatalink', '7916', 'updateParam', '8842', 'updateParam', '2254', 'updateDatalink', '7819', 'addModule', '9947', 'updateParam', '9240', 'updateDatalink', '8972', 'updateDatalink', '5569', 'updateParam', '7455', 'updateParam', '9733', 'updateDatalink', '3860', 'addModule', '2825', 'updateDatalink', '6257', 'updateDatalink', '5505', 'updateDatalink', '4913', 'addModule', '9344', 'updateDatalink', '4467', 'addModule', '4389', 'updateDatalink', '9933', 'updateDatalink', '7167', 'updateParam', '8774', 'updateParam', '5396', 'updateParam', '3314', 'addModule', '3653', 'updateDatalink', '7723', 'addModule', '6241', 'updateDatalink', '7824', 'updateParam', '9509', 'updateParam', '5995', 'updateParam', '7881', 'updateDatalink', '5381', 'updateParam', '5825', 'updateDatalink', '7694', 'updateParam', '8042', 'addModule', '6839', 'updateParam', '4097', 'updateParam', '4620', 'updateParam', '7755', 'addModule', '6768', 'updateParam', '7268', 'updateParam', '9557', 'updateDatalink', '6879', 'addModule', '7235', 'updateParam', '7753', 'updateParam', '6550', 'updateParam', '4640', 'updateDatalink', '6586', 'addModule', '6471', 'addModule', '2191', 'addModule', '5162', 'updateDatalink', '9225', 'addModule', '4877', 'updateParam', '9893', 'addModule', '3990', 'updateDatalink', '8398', 'updateParam', '9996', 'updateDatalink', '7178', 'addModule', '3632', 'updateDatalink', '5972', 'updateDatalink', '4449', 'addModule', '9956', 'updateDatalink', '2083', 'updateParam', '5218', 'updateDatalink', '9488', 'addModule', '7804', 'updateDatalink', '2359', 'updateParam', '8593', 'updateDatalink', '9025', 'updateDatalink', '8251', 'updateDatalink', '3027', 'updateParam', '4517', 'updateDatalink', '6665', 'addModule', '6057', 'updateDatalink', '9738', 'updateParam', '7159', 'updateParam'],
    ['4294', 'addModule', '4110', 'updateParam', '6120', 'updateDatalink', '6015', 'updateDatalink', '4308', 'addModule', '9424', 'updateDatalink', '5237', 'addModule', '5310', 'updateDatalink', '9798', 'addModule', '4896', 'updateDatalink', '3744', 'updateParam', '2790', 'updateDatalink', '3934', 'updateParam', '3138', 'updateDatalink', '7702', 'updateParam', '6048', 'updateParam', '8640', 'updateDatalink', '7519', 'addModule', '5998', 'addModule', '6144', 'updateDatalink', '2996', 'updateDatalink', '5824', 'addModule', '9257', 'updateParam', '7752', 'addModule', '2646', 'updateDatalink', '4908', 'addModule', '9742', 'addModule', '4322', 'addModule', '4203', 'updateParam', '2354', 'updateDatalink', '6268', 'updateParam', '2236', 'updateParam', '2657', 'addModule', '7131', 'updateDatalink', '6102', 'updateDatalink', '5961', 'addModule', '9780', 'addModule', '5245', 'updateDatalink', '3872', 'updateParam', '4208', 'updateDatalink', '9530', 'updateParam', '6400', 'updateDatalink', '9471', 'updateParam', '5087', 'updateDatalink', '2464', 'updateParam', '3651', 'updateParam', '4966', 'updateParam', '8264', 'updateParam', '3137', 'addModule', '6064', 'updateDatalink', '6505', 'addModule', '2116', 'updateParam', '6513', 'updateParam', '8369', 'updateDatalink', '7217', 'updateDatalink', '9891', 'updateDatalink', '3366', 'updateDatalink', '9616', 'updateParam', '9127', 'updateParam', '8858', 'updateDatalink', '4695', 'updateParam', '8835', 'addModule', '8055', 'updateDatalink', '2468', 'updateParam', '3121', 'updateDatalink', '9688', 'addModule', '3527', 'addModule', '5510', 'updateDatalink', '7299', 'addModule', '2127', 'updateParam', '9677', 'addModule', '6264', 'updateDatalink', '5321', 'addModule', '9052', 'updateDatalink', '3158', 'addModule', '9662', 'updateDatalink', '9125', 'addModule', '5963', 'updateDatalink', '8045', 'updateDatalink', '9439', 'updateDatalink', '3900', 'updateDatalink', '9621', 'updateDatalink', '5742', 'addModule', '9293', 'addModule', '2491', 'addModule', '7701', 'addModule', '5887', 'addModule', '5041', 'addModule', '4809', 'updateDatalink', '9450', 'updateDatalink', '6262', 'updateParam', '7773', 'updateDatalink', '6232', 'addModule', '9341', 'updateParam', '9696', 'updateDatalink', '4012', 'updateParam', '7015', 'updateParam', '7733', 'updateDatalink', '9971', 'updateParam', '4865', 'updateParam'],
    ['4039', 'addModule', '7359', 'addModule', '3872', 'addModule', '9727', 'updateDatalink', '3303', 'addModule', '9488', 'updateDatalink', '5475', 'updateDatalink', '6708', 'addModule', '4788', 'updateParam', '7356', 'updateDatalink', '2422', 'updateDatalink', '5065', 'addModule', '4133', 'updateDatalink', '3273', 'updateParam', '5563', 'addModule', '5011', 'updateParam', '6314', 'updateDatalink', '5579', 'addModule', '2039', 'updateDatalink', '3367', 'updateParam', '3800', 'updateParam', '8057', 'updateParam', '9936', 'updateDatalink', '5474', 'updateDatalink', '3707', 'addModule', '2330', 'updateParam', '5943', 'addModule', '6095', 'updateParam', '7962', 'updateParam', '7275', 'addModule', '6007', 'updateDatalink', '3320', 'addModule', '2447', 'updateParam', '3425', 'updateParam', '2991', 'updateParam', '5476', 'updateParam', '3168', 'updateParam', '4378', 'updateParam', '9329', 'updateDatalink', '7032', 'updateDatalink', '7404', 'addModule', '9199', 'addModule', '4683', 'updateDatalink', '5504', 'updateDatalink', '9862', 'updateParam', '3832', 'updateParam', '4598', 'addModule', '3363', 'updateParam', '3838', 'updateDatalink', '3500', 'updateParam', '2159', 'updateDatalink', '2938', 'updateParam', '7372', 'updateDatalink', '8118', 'updateDatalink', '6648', 'updateParam', '2328', 'addModule', '2402', 'updateParam', '6693', 'updateDatalink', '3199', 'addModule', '8303', 'addModule', '2922', 'addModule', '6734', 'updateDatalink', '9456', 'addModule', '2211', 'addModule', '4138', 'updateDatalink', '8658', 'updateDatalink', '5225', 'addModule', '2888', 'updateParam', '4624', 'updateDatalink', '5193', 'updateParam', '7137', 'addModule', '2560', 'updateDatalink', '5478', 'updateDatalink', '5790', 'updateParam', '8298', 'updateDatalink', '7750', 'addModule', '2480', 'updateParam', '6023', 'addModule', '6949', 'updateDatalink', '9188', 'addModule', '3246', 'updateDatalink', '6001', 'updateParam', '4121', 'updateDatalink', '8711', 'updateParam', '5386', 'addModule', '5769', 'updateDatalink', '2290', 'addModule', '7174', 'updateParam', '7657', 'updateParam', '9718', 'addModule', '5036', 'updateParam', '9357', 'addModule', '6124', 'addModule', '7990', 'addModule', '9698', 'updateParam', '5865', 'updateDatalink', '7314', 'updateParam', '6883', 'updateDatalink', '9028', 'updateDatalink', '4041', 'updateParam'],
    ['3783', 'addModule', '2608', 'updateDatalink', '9624', 'updateParam', '5439', 'updateDatalink', '2296', 'updateDatalink', '9553', 'updateParam', '5713', 'updateDatalink', '8106', 'updateParam', '7778', 'updateDatalink', '9816', 'updateParam', '9099', 'updateDatalink', '7340', 'updateParam', '4333', 'updateDatalink', '3407', 'addModule', '3424', 'updateParam', '3972', 'addModule', '3989', 'addModule', '3639', 'updateDatalink', '6080', 'addModule', '8591', 'addModule', '4603', 'addModule', '2289', 'updateParam', '2615', 'addModule', '3197', 'updateParam', '4769', 'updateDatalink', '7752', 'updateDatalink', '2143', 'addModule', '7867', 'updateDatalink', '3720', 'updateParam', '4195', 'addModule', '5745', 'addModule', '4403', 'updateParam', '2237', 'updateParam', '7720', 'updateDatalink', '7880', 'updateParam', '4991', 'addModule', '4558', 'updateDatalink', '3511', 'updateParam', '6787', 'updateParam', '9857', 'updateDatalink', '5278', 'addModule', '3999', 'updateParam', '7896', 'updateDatalink', '5922', 'updateDatalink', '9259', 'updateParam', '4012', 'updateDatalink', '4230', 'updateParam', '6462', 'addModule', '4539', 'addModule', '8936', 'updateParam', '5814', 'addModule', '3760', 'updateParam', '8232', 'addModule', '7867', 'updateParam', '6079', 'updateParam', '2765', 'addModule', '9438', 'addModule', '3770', 'addModule', '5272', 'updateDatalink', '7747', 'updateParam', '9149', 'addModule', '4633', 'updateParam', '2856', 'updateDatalink', '9954', 'updateDatalink', '5155', 'updateDatalink', '7627', 'addModule', '6924', 'addModule', '8266', 'updateParam', '9949', 'addModule', '8259', 'updateDatalink', '4597', 'updateParam', '6855', 'updateParam', '5635', 'addModule', '2527', 'updateParam', '5438', 'updateParam', '5839', 'updateDatalink', '3835', 'updateParam', '6083', 'addModule', '5853', 'addModule', '8937', 'updateParam', '2593', 'updateParam', '2380', 'updateDatalink', '2500', 'addModule', '8129', 'updateDatalink', '8279', 'updateDatalink', '3836', 'updateDatalink', '6693', 'addModule', '9308', 'addModule', '2504', 'updateParam', '9986', 'updateParam', '3810', 'updateParam', '2940', 'updateParam', '6016', 'addModule', '6638', 'updateParam', '9699', 'updateParam', '7718', 'updateDatalink', '7613', 'updateParam', '6034', 'updateDatalink', '8084', 'updateParam', '3217', 'updateDatalink'],
    ['3528', 'addModule', '5857', 'updateParam', '7376', 'updateDatalink', '9151', 'updateDatalink', '9291', 'updateDatalink', '9617', 'addModule', '5950', 'updateDatalink', '9503', 'updateParam', '2768', 'addModule', '4276', 'addModule', '7776', 'addModule', '9616', 'addModule', '4532', 'addModule', '3541', 'updateDatalink', '9285', 'updateDatalink', '2935', 'updateParam', '9663', 'addModule', '9699', 'updateParam', '2121', 'updateParam', '5814', 'updateDatalink', '5407', 'updateParam', '4522', 'updateDatalink', '3295', 'addModule', '8920', 'updateParam', '5831', 'updateDatalink', '5174', 'updateParam', '6344', 'addModule', '9640', 'updateDatalink', '7478', 'addModule', '9116', 'updateDatalink', '5484', 'updateDatalink', '5487', 'updateDatalink', '2027', 'updateDatalink', '4013', 'addModule', '4768', 'addModule', '4506', 'updateParam', '5947', 'addModule', '2643', 'addModule', '4244', 'updateDatalink', '4681', 'updateParam', '3151', 'updateDatalink', '6798', 'addModule', '3108', 'addModule', '6339', 'updateParam', '8657', 'updateParam', '4193', 'addModule', '3862', 'addModule', '9561', 'updateDatalink', '5240', 'updateParam', '6372', 'updateDatalink', '9468', 'updateDatalink', '4582', 'updateDatalink', '9092', 'updateDatalink', '7616', 'updateParam', '5511', 'addModule', '3202', 'addModule', '8474', 'addModule', '8846', 'updateDatalink', '7344', 'updateParam', '7192', 'updateDatalink', '7376', 'addModule', '2532', 'updateParam', '4257', 'addModule', '9697', 'updateParam', '6171', 'updateDatalink', '6597', 'updateParam', '8622', 'addModule', '5644', 'addModule', '7274', 'updateDatalink', '3324', 'updateDatalink', '2057', 'updateDatalink', '3151', 'updateParam', '5793', 'updateDatalink', '7266', 'addModule', '2578', 'addModule', '3928', 'addModule', '5191', 'updateDatalink', '6143', 'updateParam', '4757', 'updateParam', '8686', 'addModule', '9939', 'updateParam', '6760', 'updateParam', '8880', 'addModule', '7547', 'addModule', '3173', 'updateDatalink', '9904', 'updateDatalink', '3096', 'addModule', '3442', 'addModule', '5351', 'updateParam', '2253', 'updateDatalink', '2584', 'updateParam', '4524', 'addModule', '5908', 'addModule', '5286', 'addModule', '9701', 'addModule', '9571', 'updateParam', '7913', 'addModule', '5184', 'updateDatalink', '7141', 'updateParam', '2393', 'updateParam']
];

var INSTRUCTIONS_PER_COLLABORATOR = 99;







//Workflow Construction
var workflow = new Tree('n1');

workflow.add('n2', 'n1', workflow.traverseDF);
workflow.add('n3', 'n1', workflow.traverseDF);
workflow.add('n4', 'n2', workflow.traverseDF);
workflow.add('n5', 'n2', workflow.traverseDF);
workflow.add('n6', 'n3', workflow.traverseDF);
workflow.add('n7', 'n3', workflow.traverseDF);

var NUM_OF_MODULES = 7;







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

    print_list(grantedNodeAccesses, "NEW GRANT LIST");
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
            console.log("Node Counts : " + this.getCountsOfMyAccessNode() + " (Nodes: " + this.getAllMyAccessedNodes()+" )");
            if(this.nextInstructionSerial%2 == 0){//this phase is my thinking time
                var thinkingTime = workflow_instructions[this.collaboratorID][this.nextInstructionSerial];

                if(thinkingTime >= 5000){//if thinking time is too much, release floor for others
                    this.nextInstructionSerial++;
                    console.log("NODE_ACCESS_RELEASED" + "_" + this.collaboratorID + " (Nodes: " + this.getAllMyAccessedNodes() +" )");
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
                  console.log("UPDATE" + "_" + this.collaboratorID + " (Nodes: " + this.getAllMyAccessedNodes() +" )");
                  this.nextInstructionSerial++; //lets try to move for next instruction
                  var me = this;
                  setTimeout(function() {
                    me.simulate();
                  }, 100);
            }


        }else{//I dont have any access, so request for it
            if(this.isAccessRequestedAlready == false){//not requested yet..?, request access
                this.isAccessRequestedAlready = true;
                console.log("NODE_ACCESS_REQUESTED"+ "_" + this.collaboratorID + " (NodeID: " + this.getNodeWithLowerDependencyDegree_exceptUserLockedAndWaitingNodes() + ")");

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
    }


};














//Testing

function print_list(theList, listName) {
  console.log("PRINTING : " + listName + " ====> ");

  for (var i = 0; i < theList.length; i++) {
    console.log("collab: " + theList[i]["collaboratorID"] + " node:" + theList[i]["node"]);

  }

}



//collaborators
var c0 = new WorkflowCollaborator(0,0);
var c1 = new WorkflowCollaborator(1,0);
var c2 = new WorkflowCollaborator(2,0);
var c3 = new WorkflowCollaborator(3,0);
var c4 = new WorkflowCollaborator(4,0);

c0.simulate();
c1.simulate();
c2.simulate();
c3.simulate();
c4.simulate();



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




















