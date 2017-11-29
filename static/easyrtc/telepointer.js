var all_occupants_list = ""; //list of easyrtcid of all the logged in clients
var all_occupants_details = []; //list of logged in clients along with email, name and corresponding easyrtcid
var selfEasyrtcid = ""; //my own easyrtc id

//user info required for rtc
var user_name = "";
var user_email = "";


//collaboration locking information
var current_floor_owner = "NONE";
var floor_requests_queue = [];


//IMPORTANT
//this id remain unique throughout the pipeline for a module
var unique_module_id = 1;



$(document).ready(function(){


//========================================================
//================ ALL INITIALIZATION CODES STARTS =======
//========================================================

    //connect and login to the easyrtc node server.
    connect();

    //get the user required information from the DOM
    user_name = $("#user_name").text();
    user_email = $("#user_email").text();







//========================================================
//================ ALL INITIALIZATION CODES ENDS =========
//========================================================


















//========================================================
//===================== COLLABORATION CODE STARTS ========
//========================================================

    //User requests for floor...
    function requestFloor(requestor_id){
        //No user is holding the floor now
        if(current_floor_owner == "NONE"){
            //update my vars and UIs
            onFloorOwnerChanged(requestor_id);

            //also inform this to others...
            notifyAll("floor_owner_changed", requestor_id);
            return true;//inform the requestor that he has got the floor
        }
        //someone is using the floor currently... so add the requestor to the list
        else{
            //add this requestor to the waiting list.
            onNewFloorRequest(requestor_id);
            //inform every other user too..
            notifyAll("new_floor_request", requestor_id);

            //inform this requestor that he has not got the floor and will have to wait...
            return false;

        }
    }

    //User releases Floor
    function releaseFloor(){
        //call my floor release first
        onFloorRelease();

        //inform all other users as well...
        //in this case no special message is required
        notifyAll("release_floor", "NA");
    }

    //checks if its my turn currently and allowed for changes
    function isItMyFloor(){
        //alert("Current Floor Owner: " + current_floor_owner);
        //alert("My Email: " + user_email);

        if(current_floor_owner == user_email)return true;
        return false;
    }
















    //chat room communication
    $("#chatRoom_send_msg_btn").click("on", function(){

        var text = $("#chatRoom_send_msg_txt").val(); //get the msg content

        if(text.replace(/\s/g, "").length === 0) { // Don"t send just whitespace
            return;
        }

        //empty the text box for further msg
        $("#chatRoom_send_msg_txt").val("");

        //create the telegram for all the clients.
        //as its a chat room msg, we don't specify the reciever.
        var telegram = {"sender": user_name, "msg": text};
        var telegram_for_myself = {"sender": "Me", "msg": text};

        //add to my chat room conversation
        addToChatRoomConversation(telegram_for_myself);

        //and also send to all other clients for adding to their chat room conversation
        notifyAll("chat_room_msg", telegram);

    });



    //Collaborative white board
    var canvas = document.getElementById("mycanvas");
    var context = canvas.getContext('2d');

    var clickX = new Array();
    var clickY = new Array();
    var clickDrag = new Array();
    var paint;

    function addClick(x, y, dragging) {
      clickX.push(x);
      clickY.push(y);
      clickDrag.push(dragging);
    }


    $('#mycanvas').mousedown(function(e) {
            var rect = e.currentTarget.getBoundingClientRect(),
          offsetX = e.clientX - rect.left,
          offsetY = e.clientY - rect.top;

      var mouseX = e.pageX - this.offsetLeft;
      var mouseY = e.pageY - this.offsetTop;



      paint = true;
      addClick(offsetX, offsetY);
      redraw();
    });


    $('#mycanvas').mousemove(function(e) {
            var rect = e.currentTarget.getBoundingClientRect(),
          offsetX = e.clientX - rect.left,
          offsetY = e.clientY - rect.top;

          //alert(offsetX);

      if (paint) {
        addClick(offsetX, offsetY, true);
        redraw();
      }
    });


    $('#mycanvas').mouseup(function(e) {
      paint = false;
    });


    $('#mycanvas').mouseleave(function(e) {
      paint = false;
    });


    function redraw() {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

      context.strokeStyle = "#df4b26";
      context.lineJoin = "round";
      context.lineWidth = 3;

      for (var i = 0; i < clickX.length; i++) {
        context.beginPath();
        if (clickDrag[i] && i) {
          context.moveTo(clickX[i - 1], clickY[i - 1]);
        } else {
          context.moveTo(clickX[i] - 1, clickY[i]);
        }
        context.lineTo(clickX[i], clickY[i]);
        context.closePath();
        context.stroke();
      }
    }
    //collaborative white board ends



    //Hidden Display controls
    $("#id_collaborativeToolsDiv").click("on", function(){
        $("#collaboration_tools").toggle(750);
    });

    $("#id_chatRoomDiv").click("on", function(){
        $("#chatRoom").toggle(750);
    });

    $("#id_canvasDiv").click("on", function(){
        $("#whiteBoard").toggle(750);
    });

    $("#id_collaboration_controls").click("on", function(){
        $("#collaboration_controls").toggle(750);
    });

    $("#collaboration_controls_request_turn").click("on", function(){
        if($(this).text() == 'Request Floor'){
            $(this).prop('disabled', true); //dont allow to request multiple times
            $(this).text('Waiting For Floor');
            $(this).css('background-color', 'DARKGOLDENROD');
            //finally request the floor
            requestFloor(user_email);
        }

        else if($(this).text() == "Release Floor"){
            $(this).text('Request Floor');
            $(this).css('background-color', 'darkcyan');

            releaseFloor();
        }

    });

//========================================================
//===================== COLLABORATION CODE ENDS ==========
//========================================================




























//========================================================
//===================== EASYRTC CODE STARTS ==============
//========================================================

$(document).mousemove(function(e){
    var my_telepointer_info = {"left":e.pageX-50,
                             "top":e.pageY-50,
                             "email":user_email,
                             "rtcid": selfEasyrtcid,
                             "user_name":user_name
                            };

    notifyAll("telepointer_info", my_telepointer_info);


});










//Notify all the other clients of the message with the passed message type.
function notifyAll(messageType, message){
    //loop through all the other clients and send the message.
    for(var otherEasyrtcid in all_occupants_list) {
            easyrtc.sendDataWS(otherEasyrtcid, messageType,  message);
    }
}










//Message reciver for the message sent from other clients.
//this method performs actions according to the received msgType
function onMessageRecieved(who, msgType, content) {

    switch(msgType) {
        case "telepointer_info":
            updateTelepointer(content);
            break;
        case "inform_my_details_to_all_other_clients":
            addNewClientToAllOccupantsDetails(content);
            updateOnlineStatusOfClients(all_occupants_details);
            break;
        case "disconnected":
            alert("Disconnected : " + content);
            break;
        case "chat_room_msg":
            addToChatRoomConversation(content);
            break;
        case "floor_owner_changed":
            onFloorOwnerChanged(content);
            break;
        case "new_floor_request":
            onNewFloorRequest(content);
            break;
        case "release_floor":
            onFloorRelease();
            break;
        case "remote_module_addition":
            onRemoteModuleAddition(content);
            break;
        case "moduleSettingsChanged":
            onModuleSettingsChanged(content);
            break;




    }
}



function onModuleSettingsChanged(changeInfo){
    $(changeInfo.elementInfo).eq(changeInfo.paramIndex).val(changeInfo.newParamValue).change();
}



function onRemoteModuleAddition(moduleInfo){
    //making sure the snychronization is ok...
    if(getNextUniqueModuleID() == moduleInfo.newModuleID){
        addModuleToPipeline(moduleInfo.newModuleID, moduleInfo.newModuleName);
        updateNextUniqueModuleID();//update my own unique module id for later use too...

        //as its remote module addition... most likely its not my floor...
        //doing a further check for safety before locking the param settings...
        lockParamsSettings();
    }else{
        alert("Some Error Occured while Remote Module Addition. Synchronization Failed!");
    }
}



function onNewFloorRequest(requestor_id){
    //push the new requestor to the end of the waiting list.
    floor_requests_queue.push(requestor_id);

    //show the updated floor information...
    updateUI_floorInformation();
}

function onFloorRelease(){
        var newFloorOwner = "NONE";
        //if someone is in the waiting list... assign the floor to the first one
        if(floor_requests_queue.length > 0){
            newFloorOwner = floor_requests_queue.shift();
        }

        //floor owner changed
        onFloorOwnerChanged(newFloorOwner);
}



function onFloorOwnerChanged(newFloorOwner){
    current_floor_owner = newFloorOwner;



    //TODO: change lockings (if current user is me...)
    if(isItMyFloor() == true){

        $("#collaboration_controls_request_turn").text('Release Floor');
        alert("You have Got the Floor");
        $("#collaboration_controls_request_turn").prop('disabled', false);
        $("#collaboration_controls_request_turn").css('background-color', 'salmon');
        //as I have got the floor... unlock every para settings for me to work...
        unlockParamsSettings();
    }else{
        //as its not this user's turn... lock all the param settings...
        lockParamsSettings();
    }




    //update current owner and floor requests queue
    updateUI_floorInformation();

}


//lock the UIs (setting params) from changing for this user...
function lockParamsSettings(){
    $(".setting_param").prop("disabled", true);
}
//unlock the UIs (setting params) from changing for this user...
function unlockParamsSettings(){
    $(".setting_param").prop("disabled", false);
}




//update the ui showing new floor owner and floor requests queue
function updateUI_floorInformation(){

    //update ui: current floor owner
    if(isItMyFloor() == true)$("#collaboration_controls_current_floor_owner").text("Current Floor Owner: Me");
    else $("#collaboration_controls_current_floor_owner").text("Current Floor Owner: " + getNameForAnEmail(current_floor_owner) );






    //update ui: floor requests queue
    $("#collaboration_controls_floor_requests_queue").text("Floor Requests Queue: ");
    for(var i=0;i < floor_requests_queue.length; i++){
        //append this user to the end of ui
        $("#collaboration_controls_floor_requests_queue").append("<i>" + getNameForAnEmail(floor_requests_queue[i]) +"</i>");

        //extra: show arrow for intuition
        if(i != floor_requests_queue.length - 1)$("#collaboration_controls_floor_requests_queue").append(" => ");
    }


}






//add the newly obtained client details to the list (e.g. like phonebook)
function addNewClientToAllOccupantsDetails(newClientDetails){
    all_occupants_details.push(newClientDetails);
}


function addToChatRoomConversation(telegram){
  // Escape html special characters, then add linefeeds.
  var content = telegram.msg;
  var sender = telegram.sender;
  content = content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  content = content.replace(/\n/g, "<br />");

  sender = "<strong>" + sender + "</strong>";

  var previous_messages = $("#chatRoom_all_msg").html();

  $("#chatRoom_all_msg").html(previous_messages + sender + ": " +content + "<br/>");

}


//update online status based on the available clients
function updateOnlineStatusOfClients(all_occupants_details){
    //first every user's status label to offline
    $(".online_status").text(' (Offline) ').css('color', '#C0C0C0');

    //then update the online status based on logged in clients.
    for(var i=0; i<all_occupants_details.length; i++){
        var userEmail = all_occupants_details[i].email;
        $('#online_status_'+convertEmailToID(userEmail)).text(' (Online) ').css('color', '#0f0');
    }
}







function convertEmailToID(email){
    //an email to be id, must not contain some special characters
    //TODO: currently removed occurance of any . or @ by _ need to handle other special characters too
    return email.replace(/\.|@/g, '_');
}





function connect() {
    easyrtc.setSocketUrl(":8080");
    easyrtc.setPeerListener(onMessageRecieved);
    easyrtc.setRoomOccupantListener(userLoggedInListener);
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
}



//callback function, called upon new client connection or disconnection
function userLoggedInListener (roomName, occupants, isPrimary) {
    //update the global occupants list for this user.
    all_occupants_list = occupants;

    //as this callback method is also called on any user disconnection...
    //remove any 'zombie' easyrtc id from 'all_occupants_details' variable
    removeZombieClientsFromOccupantsDetails(occupants);

    //update the online/offline status as per the new list.
    //this update is important for someone leaves the connection.
    updateOnlineStatusOfClients(all_occupants_details);

    //spawn telepointers for the logged in users.
    spawnTelepointers(occupants);

    //inform my email, name along with easyrtc id, which is later used for different tracking
    informMyDetailsToAllOtherClients(occupants);

    //notifyAll('disconnected', "Hello");
}


//removes any invalid ids (the users of whom have left/disconnect)
//from the server. the passed occupants is the updated list of easyrctid
//the occupants_details are updated (removed the invalids) accordingly
function removeZombieClientsFromOccupantsDetails(occupants){
    var temp_occupants_details = [];

    for(var i=0;i < all_occupants_details.length; i++){
        var aClient = all_occupants_details[i];

        var isValid = 0;

        for(aEasyrtcid in occupants){
            if(aEasyrtcid == aClient.easyrtcid){
                isValid = 1; //this client is still on the list and online (connected and valid)
                break;
            }
        }

        //add the valid client to the temporary updated list
        if(isValid ==1){
            temp_occupants_details.push(aClient);
        }

    }

    //finally assign the temp new occupants details as the updated occupants details.
    all_occupants_details = temp_occupants_details;


}





//inform all other clients about my details: name, email, easyrtcid
//these additional info along with easyrtcid (which is available in
//'all_occupants_list') are used for mapping (e.g. which easyrtcid
//is for which emails and so on)
function informMyDetailsToAllOtherClients(occupants){
    var myInfo = {'email': $("#user_email").text(), 'easyrtcid': selfEasyrtcid, 'name': $("#user_name").text()};

    //notify all other clients for email for corresponding easyrtcid
    notifyAll('inform_my_details_to_all_other_clients', myInfo);
}



//returns the corresponding name for a given email id
function getNameForAnEmail(clientEmail) {
  for (var i = 0; i < all_occupants_details.length; i++) {
    if (all_occupants_details[i].email == clientEmail) return all_occupants_details[i].name;
  }

  //own email id is not available in all_occupants_details...
  //so return own user_name in that case...
  if(clientEmail == user_email)return user_name;

  //the email not found...
  return "NONE";
}






//spawn the telepointers for the passed occupants
function spawnTelepointers(occupants){

    //==================================================
    //spawn the telepointers for all the connected users.
    //==================================================
    var telepointer_spawn_point = document.getElementById('telepointer_spawn_point');
    //first remove any existing telepointer for a fresh start
    while (telepointer_spawn_point.hasChildNodes()) {
        telepointer_spawn_point.removeChild(telepointer_spawn_point.lastChild);
    }
    //and then create elements for occupants with corresponding easyrtcid
    for(var easyrtcid in occupants) {
            var ele = document.createElement("div");
            ele.setAttribute("id","telepointer_name_"+easyrtcid);

            ele.style.color = "#000";
            ele.style.backgroundColor =  "#fff";
            ele.style.boxShadow = "2px 2px 3px grey";
            //ele.setAttribute("class","inner");
            //ele.innerHTML="hi "+easyrtcid;
            telepointer_spawn_point.appendChild(ele);
    }
}












//update the telepointer for the other clients
//the 'content' should contain the required info for telepointer update
//along with other client easyrtcid; which is used for selecting the specific
//element from dom
function updateTelepointer(content){
    //telepointer was spawned according to the easyrtc id.
    //telepointer selected first and then updatee the css for rendering
    $('#telepointer_name_'+content.rtcid).css({position:'absolute',left:parseInt(content.left), top:parseInt(content.top)});
    if($('#telepointer_name_'+content.rtcid).text()=="")$('#telepointer_name_'+content.rtcid).html(content.user_name);

}








function sendStuffWS(otherEasyrtcid) {
    var text = document.getElementById('sendMessageText').value;
    if(text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }

    easyrtc.sendDataWS(otherEasyrtcid, "message",  text);
    addToConversation("Me", "message", text);
    document.getElementById('sendMessageText').value = "";
}







function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;
    //document.getElementById("iam").innerHTML = "I am " + easyrtcid;
}







function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}


//========================================================
//===================== EASYRTC CODE ENDS ================
//========================================================




















//========================================================
//================== WORKFLOW CONTROL CODE STARTS ========
//========================================================


    $('pre code').each(function (i, block) {
        hljs.highlightBlock(block);
    });


//==========================================================================
//============= NOISE REMOVAL STARTS =======================================
//==========================================================================

//source code in pre tag... toggle show/hide
$(".code_show_hide").live('click', function () {
    $(this).siblings('.pre_highlighted_code').children(".highlighted_code").toggle(1000);
});

$(".documentation_show_hide").live('click', function () {
    $(this).siblings('.documentation').toggle(300);
});

$(".settings_show_hide").live('click', function () {
    $(this).siblings('.settings').toggle(300);
});

$(".btn_edit_code").live('click',function () {
    $(this).siblings('.edit_code').toggle(1000);
});

$(".setting_param").live('change',function () {
    //alert("you changed my value");
    //var prev_code = $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val();
    //alert(prev_code);
    //$(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val(prev_code + "\n" + $(this).val());
    $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val('');
    $(this).siblings(".setting_param").each(function () {
        //alert($(this).val());
        var prev_code = $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val();
        $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val(prev_code + "\n" + $(this).val());
    });
    var prev_code = $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val();
    $(this).parent().parent().siblings(".setting_section").children(".edit_code").find(".code_settings").val(prev_code + "\n" + $(this).val());



    //get module id and param information for change in the remote clients
    //var myPar = $(this).closest(".module");
    //alert(myPar.attr('id'));
    //alert($(this).index("#" + myPar.attr('id') + "  .setting_param"));

    //inform of this change to all the other clients...
    if(isItMyFloor() == true){
        var myParent = $(this).closest(".module");
        var elementInfo = "#" + myParent.attr('id') + "  .setting_param";
        var paramIndex = $(this).index(elementInfo);
        var newParamValue = $(this).val();
        var changeInfo = {"elementInfo": elementInfo, "paramIndex": paramIndex, "newParamValue": newParamValue};
        notifyAll("moduleSettingsChanged", changeInfo);
    }




});

$("#run_pipeline").click(function () {
    $("#pr_status").html("Running Pipeline...");

    var sourceCode = ''
    $('textarea').each(
        function () {
            //alert($(this).val());
            sourceCode = sourceCode + $(this).val();
        }
    );

    //encode the source code for any special characters like '+' , '/' etc
    sourceCode = encodeURIComponent(String(sourceCode));

    //alert(sourceCode);

    //send the code for running in pythoncom
    $.ajax({
        type: "POST",
        cache: false,
        url: "/pythoncom/",
        data: 'textarea_source_code=' + sourceCode,
        success: function (option) {
            alert(option);
            $("#pr_status").html("Pipeline Completed Running Successfully.");
        },
        error: function (xhr, status, error) {
            alert(xhr.responseText);
            $("#pr_status").html("Pipeline Running Failed!!!");
        }

    });




});


$("#save_pipeline").click(function () {
    var pipelineName = $("#save_pipeline_name").val();

    //alert(pipelineName);

    var sourceCode = ''
    $('textarea').each(
        function () {
            //alert($(this).val());
            sourceCode = sourceCode + $(this).val();
        }
    );

    //encode the source code for any special characters like '+' , '/' etc
    sourceCode = encodeURIComponent(String(sourceCode));


    //alert(sourceCode);

    $.ajax({
        type: "POST",
        cache: false,
        url: "/save_pipeline/",
        data: 'textarea_source_code=' + sourceCode + '&pipelineName='+pipelineName,
        success: function (option) {
            alert('Piepline Saved Successfully...');
        },
        error: function (xhr, status, error) {
            alert(xhr.responseText);
        }

    });




});

$(".design_pipeline_menu").click(function () {
    alert($(this).attr('title'));
});

$("#design_pipelines_menu_rgb2gray_id").click(function () {
    var module_name = ''
    var documentation = ''
    var moduleSourceCode_settings = ''
    var moduleSourceCode_main = ''
    var moduleSourceCode_html = ''

    $.ajax({
        type: "POST",
        cache: false,
        url: "/get_module_details",
        data: 'p_module_key=' + 'rgb2gray',
        success: function (option) {

            module_name = option.module_name
            documentation = option.documentation
            moduleSourceCode_settings = option.moduleSourceCode_settings
            moduleSourceCode_main = option.moduleSourceCode_main
            moduleSourceCode_html = option.moduleSourceCode_html
            user_role = option.user_role

            user_role_based_edit = ''
            if (user_role == 'image_researcher') {
                user_role_based_edit = '| <a style="font-size:12px;color:#000000;" href="#" class="btn_edit_code"> Edit </a> | <a style="font-size:12px;color:#000000;" href="#" > Contact Author </a>';
            }




            //append new module to the pipeline...
            $("#img_processing_screen").append(
                '<div style="background-color:#FFFFFF;width:100%">' +

            '<!-- Documentation -->' +
            '<div style="margin:10px;font-size:17px;color:#000000;">' +
              ' ' + module_name + '<hr/>' +
               ' Documentation: <a style="font-size:12px;color:#000000;" href="#" class="documentation_show_hide">(Show/Hide)</a>' +
                '<div class="documentation" style="background-color:#888888;display:none;font-size:14px;">' + documentation +'</div>' +
            '</div>' +


            '<!-- Settings -->' +
            '<div style="margin:10px;font-size:17px;color:#000000;">' +
             '   Settings: <a style="font-size:12px;color:#000000;" href="#" class="settings_show_hide">(Show/Hide)</a>' +
             '   <div class="settings" style="background-color:#888888;display:none;font-size:14px;">' + moduleSourceCode_html + '</div>' +
            '</div>' +


            '<div style="margin:10px;font-size:17px;color:#000000;" class="setting_section">' +
            '    Source Code: <a style="font-size:12px;color:#000000;" href="#" class="code_show_hide">(Show/Hide)</a>'+ user_role_based_edit +

             '   <div class="edit_code" style="background-color:#888888;display:none;font-size:14px;">' +
              '          <textarea rows=7 cols=180 class="code_settings">' + moduleSourceCode_settings + '</textarea>' +
               '         <p style="color:#000000;">Main Implementation: </p>' +
                '        <textarea rows=10 cols=180>' + moduleSourceCode_main + '</textarea>' +
                '</div>' +

               ' <pre style="background-color:#333333;width:100%;" class="pre_highlighted_code">' + '<code class="python highlighted_code" style="display:none;">' + moduleSourceCode_settings +
               ' ' +
            moduleSourceCode_main + '</code></pre>' +

           ' </div>' +

            '</div>'


        );//end of append


            $('pre code').each(function (i, block) {
                hljs.highlightBlock(block);
            });


        },
        error: function (xhr, status, error) {
            alert(xhr.responseText);
        }

    });//end of ajax





});



function getNextUniqueModuleID(){

    return unique_module_id;
}

function updateNextUniqueModuleID(){
    unique_module_id = unique_module_id + 1;
}



    //bio test starts
$("#design_pipelines_menu_biodatacleaning_id79").click(function () {

    //allowed iff the user has the floor currently...
    if(isItMyFloor() == true){
        var newModuleID = getNextUniqueModuleID();
        var newModuleName = 'biodatacleaning';
        addModuleToPipeline(newModuleID, newModuleName);

        //prepare the next valid unique module id
        updateNextUniqueModuleID();

        //add the module to all remote clients as well...
        var moduleInfo = {"newModuleID": newModuleID, "newModuleName": newModuleName};
        notifyAll("remote_module_addition", moduleInfo);
    }

});



//handling any pipeline module addition on click using
//class for generalisation
$(".pipeline_modules").click(function(){
    //alert($(this).attr("id"));

    //allowed iff the user has the floor currently...
    if(isItMyFloor() == true){
        var newModuleID = getNextUniqueModuleID();
        var newModuleName = $(this).attr("id"); //'biodatacleaning';
        addModuleToPipeline(newModuleID, newModuleName);

        //prepare the next valid unique module id
        updateNextUniqueModuleID();

        //add the module to all remote clients as well...
        var moduleInfo = {"newModuleID": newModuleID, "newModuleName": newModuleName};
        notifyAll("remote_module_addition", moduleInfo);
    }





});








//adds the module to the pipeline. moduleID is unique throughout the whole pipeline
//moduleName is the name of the module like: rgb2gray, medianFilter and so on
function addModuleToPipeline(moduleID, moduleName){

        var module_name = ''
        var documentation = ''
        var moduleSourceCode_settings = ''
        var moduleSourceCode_main = ''
        var moduleSourceCode_html = ''

        $.ajax({
            type: "POST",
            cache: false,
            url: "/get_module_details",
            data: 'p_module_key=' + moduleName,
            success: function (option) {

                module_name = option.module_name
                documentation = option.documentation
                moduleSourceCode_settings = option.moduleSourceCode_settings
                moduleSourceCode_main = option.moduleSourceCode_main
                moduleSourceCode_html = option.moduleSourceCode_html
                user_role = option.user_role

                user_role_based_edit = ''
                if (user_role == 'image_researcher') {
                    user_role_based_edit = '| <a style="font-size:12px;color:#000000;" href="#" class="btn_edit_code"> Edit </a> | <a style="font-size:12px;color:#000000;" href="#" > Contact Author </a>';
                }




                //append new module to the pipeline...
                $("#img_processing_screen").append(
                    '<div style="background-color:#EEE;width:100%" class="module" id="module_id_'+ moduleID +'">' +

                '<!-- Documentation -->' +
                '<div style="margin:10px;font-size:17px;color:#000000;">' +
                  ' ' + module_name + '<hr/>' +
                   ' Documentation: <a style="font-size:12px;color:#000000;" href="#" class="documentation_show_hide">(Show/Hide)</a>' +
                    '<div class="documentation" style="background-color:#888888;display:none;font-size:14px;">' + documentation + '</div>' +
                '</div>' +


                '<!-- Settings -->' +
                '<div style="margin:10px;font-size:17px;color:#000000;">' +
                 '   Settings: <a style="font-size:12px;color:#000000;" href="#" class="settings_show_hide">(Show/Hide)</a>' +
                 '   <div class="settings" style="background-color:#888888;display:none;font-size:14px;">' + moduleSourceCode_html + '</div>' +
                '</div>' +


                '<div style="margin:10px;font-size:17px;color:#000000;" class="setting_section">' +
                '    Source Code: <a style="font-size:12px;color:#000000;" href="#" class="code_show_hide">(Show/Hide)</a>' + user_role_based_edit +

                 '   <div class="edit_code" style="background-color:#888888;display:none;font-size:14px;">' +
                  '          <textarea rows=7 cols=180 class="code_settings">' + moduleSourceCode_settings + '</textarea>' +
                   '         <p style="color:#000000;">Main Implementation: </p>' +
                    '        <textarea rows=10 cols=180>' + moduleSourceCode_main + '</textarea>' +
                    '</div>' +

                   ' <pre style="background-color:#333333;width:100%;" class="pre_highlighted_code">' + '<code class="python highlighted_code" style="display:none;">' + moduleSourceCode_settings +
                   ' ' +
                moduleSourceCode_main + '</code></pre>' +

               ' </div>' +

                '</div>'


            );//end of append

            if(isItMyFloor() == false)lockParamsSettings();

                $('pre code').each(function (i, block) {
                    hljs.highlightBlock(block);
                });


            },
            error: function (xhr, status, error) {
                alert(xhr.responseText);
            }

        });//end of ajax


}









$("#design_pipelines_menu_biocalc_id").click(function () {
    var module_name = ''
    var documentation = ''
    var moduleSourceCode_settings = ''
    var moduleSourceCode_main = ''
    var moduleSourceCode_html = ''

    $.ajax({
        type: "POST",
        cache: false,
        url: "/get_module_details",
        data: 'p_module_key=' + 'biocalc',
        success: function (option) {

            module_name = option.module_name
            documentation = option.documentation
            moduleSourceCode_settings = option.moduleSourceCode_settings
            moduleSourceCode_main = option.moduleSourceCode_main
            moduleSourceCode_html = option.moduleSourceCode_html
            user_role = option.user_role

            user_role_based_edit = ''
            if (user_role == 'image_researcher') {
                user_role_based_edit = '| <a style="font-size:12px;color:#000000;" href="#" class="btn_edit_code"> Edit </a>';
            }




            //append new module to the pipeline...
            $("#img_processing_screen").append(
                '<div style="background-color:#EEE;width:100%">' +

            '<!-- Documentation -->' +
            '<div style="margin:10px;font-size:17px;color:#000000;">' +
              ' ' + module_name + '<hr/>' +
               ' Documentation: <a style="font-size:12px;color:#000000;" href="#" class="documentation_show_hide">(Show/Hide)</a>' +
                '<div class="documentation" style="background-color:#888888;display:none;font-size:14px;">' + documentation + '</div>' +
            '</div>' +


            '<!-- Settings -->' +
            '<div style="margin:10px;font-size:17px;color:#000000;">' +
             '   Settings: <a style="font-size:12px;color:#000000;" href="#" class="settings_show_hide">(Show/Hide)</a>' +
             '   <div class="settings" style="background-color:#888888;display:none;font-size:14px;">' + moduleSourceCode_html + '</div>' +
            '</div>' +


            '<div style="margin:10px;font-size:17px;color:#000000;" class="setting_section">' +
            '    Source Code: <a style="font-size:12px;color:#000000;" href="#" class="code_show_hide">(Show/Hide)</a>' + user_role_based_edit +

             '   <div class="edit_code" style="background-color:#888888;display:none;font-size:14px;">' +
              '          <textarea rows=7 cols=180 class="code_settings">' + moduleSourceCode_settings + '</textarea>' +
               '         <p style="color:#000000;">Main Implementation: </p>' +
                '        <textarea rows=10 cols=180>' + moduleSourceCode_main + '</textarea>' +
                '</div>' +

               ' <pre style="background-color:#333333;width:100%;" class="pre_highlighted_code">' + '<code class="python highlighted_code" style="display:none;">' + moduleSourceCode_settings +
               ' ' +
            moduleSourceCode_main + '</code></pre>' +

           ' </div>' +

            '</div>'


        );//end of append


            $('pre code').each(function (i, block) {
                hljs.highlightBlock(block);
            });


        },
        error: function (xhr, status, error) {
            alert(xhr.responseText);
        }

    });//end of ajax





});






    //bio test ends







//Signup
$('#signup_btn').click(function () {
    //alert("Looks like you want to create an account...");
    $.ajax({
        type: "POST",
        cache: false,
        url: "/p2irc_signup/",
        data: $("#signup_form").serialize(),
        success: function (option) {
            alert('Account Created Successfully...');
        },
        error: function (xhr, status, error) {
            alert(xhr.responseText);
        }

    });
});











//========================================================
//================== WORKFLOW CONTROL CODE ENDS ==========
//========================================================












});


