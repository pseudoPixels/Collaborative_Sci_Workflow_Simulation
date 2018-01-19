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




//Workflow Construction
var workflow = new Tree('workflow');

workflow.add('n1', 'workflow', workflow.traverseDF);
workflow.add('n2', 'workflow', workflow.traverseDF);
workflow.add('n3', 'n1', workflow.traverseDF);
workflow.add('n4', 'n1', workflow.traverseDF);
workflow.add('n5', 'n2', workflow.traverseDF);
workflow.add('n6', 'n2', workflow.traverseDF);






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
    removeFromGrantedRequestList((collaboratorID, theNode.data));
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




function print_list(theList, listName) {
  console.log("PRINTING : " + listName + " ====> ");

  for (var i = 0; i < theList.length; i++) {
    console.log("collab: " + theList[i]["collaboratorID"] + " node:" + theList[i]["node"]);

  }



}



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





//============
//Class Definition
//============
function WorkflowCollaborator(collaboratorID, nextInstructionSerial) {
  this.collaboratorID = collaboratorID;
  this.nextInstructionSerial = nextInstructionSerial;
  this.nodeAccessRequests = [];
}


WorkflowCollaborator.prototype.simulate = function() {


};
