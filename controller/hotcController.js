const path = require('path');
const dir = path.join(__dirname,"../views/hotc");

const bcrypt = require('bcryptjs');
//const request = require('request-promise');

const alertify = require('js-alert');
const axios = require('axios');


module.exports.hotcLogin=(req,res)=>{
    res.status(200).render('Login');
}

module.exports.createHospital=async(req,res)=>{
    res.status(200).render(`${dir}/createHospital`);
}

module.exports.getHotc=(req,res)=>{
    res.status(200).render(`${dir}/hotc`);
}

module.exports.matchList =async(req,res)=>{
    try {
        const result = await axios({
            url:`http://192.168.11.11:3000/api/Organ`,
            method:'GET'
        });

        const recieverlists = [];
        const reciever = await axios({
            url:`http://192.168.11.11:3000/api/Recipient`,
            method:'GET'
        });
        reciever.data.forEach((element)=>{
            recieverlists.push(element);
        });

        res.locals.recieverToRecieve = recieverlists;

        const donorsToDonate = [];

        const donorPromise = result.data.map(async(donor)=>{
            if(donor.status === "TESTED"){
                const donorToDonateDetails = await axios({
                    url:`http://192.168.11.11:3000/api/Donor/${donor.donor.split("#")[1]}`,
                    method:'GET'
                });
                donor.donor = donorToDonateDetails.data;
                donorsToDonate.push(donor);
            }
        });
        await Promise.all(donorPromise);

        res.locals.donorToDonate = donorsToDonate;

    } catch (error) {
        console.log(error.response);    
    }
    res.status(200).render(`${dir}/match`);
}

module.exports.viewHospital=async(req,res)=>{
    try {
        const result = await axios({
            url:`http://192.168.11.11:3000/api/Hospital`,
            method:'GET'
        });
        console.log(result.data);

        let hospitalLists= [];
        result.data.forEach((hospital)=>{
            hospitalLists.push(hospital);
        })
        res.locals.hospitallists = hospitalLists;

    } catch (error) {
        console.log(error.response.data);
    }
    res.status(200).render(`${dir}/hospitallist`);
}

module.exports.viewDonor= async(req,res)=>{
    try {
        const result = await axios({
            url:`http://192.168.11.11:3000/api/Organ`,
            method:'GET'
        });
        
        let donors= [];
        const donorPromise = result.data.map(async(donor)=>{
            const donorDetails= await axios({
                url:`http://192.168.11.11:3000/api/Donor/${donor.donor.split("#")[1]}`,
                method:'GET'
            });
            donor.donor = donorDetails.data;
            donors.push(donor);
        });

        await Promise.all(donorPromise);
        console.log(donors);
        res.locals.donorDetails = donors;
    } catch (error) {
        console.log(error);
    }
    
    res.status(200).render(`${dir}/donorList`);
}

module.exports.viewReciver=async (req,res)=>{
    try {
        const result = await axios({
            url:`http://192.168.11.11:3000/api/Recipient`,
            method:'GET'
        });
        
    const allrecieverlists=[];

    result.data.forEach((reciever)=>{
          allrecieverlists.push(reciever);    
    });
    res.locals.allrecieverLists = allrecieverlists;
        
    } catch (error) {
        console.log(error.response);
    }
    res.status(200).render(`${dir}/reciverList`);
}

module.exports.transplantHistory=(req,res)=>{
    res.status(200).render(`${dir}/transplantHistory`);
}

module.exports.createhospital = async (req,res)=>{
    console.log(req.body);
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    req.body.password= hashed;
    req.body.hospitalId = req.body.emailId;
    delete req.body.confirmpassword;
    req.body.role = "hospital";
    try {
        const result = await axios({
            url:'http://192.168.11.11:3000/api/Hospital',
            method:'POST',
            data: req.body,
            json:true,
            headers:{
                'Content-Type':'application/json'
            }
        }); 
        if(result.status === 200){
            alertify.alert("Hospital account created successfully");
            return res.redirect('http://localhost:8000/hotc/createHospital');
        }
      
    } 
    catch (error) {
        if(error.response.data.error.message.includes("the object already exists")){
            alertify.alert("Email already in use");
            return res.redirect('http://localhost:8000/hotc/createHospital');
        }
        alertify.alert("Something went wrong");
        return res.redirect('http://localhost:8000/hotc/createHospital');
    }
}

module.exports.matched = async(req,res)=>{
    //console.log(JSON.parse(req.body.donor));
    //console.log(JSON.parse(req.body.reciever));
    const details = {
        hospital :JSON.parse(req.body.reciever).hospital.split("#")[1],
        recipient :JSON.parse(req.body.reciever).personId,
        organ : JSON.parse(req.body.donor).organId,
    }
    try {
        const result = await axios({
            url:`http://192.168.11.11:3000/api/Matched`,
            method:'POST',
            data:details,
            json:true,
            headers:{
                'Content-Type':'application/json'
            }
        });
        if(result.status === 200){
            const result = await axios({
                url:`http://192.168.11.11:3000/api/Recipient/${JSON.parse(req.body.reciever).personId}`,
                method:'GET',
            });
            result.data.allocatedOrgan = `${JSON.parse(req.body.donor).organId}`

            const updateResult = await axios({
                url:`http://192.168.11.11:3000/api/Recipient/${JSON.parse(req.body.reciever).personId}`,
                method:'PUT',
                data: result.data,
                json:true,
                headers:{
                    'Content-Type':'application/json'
                },
            });
            if(updateResult.status === 200)
            res.status(200).redirect("http://localhost/hotc/matchlist");
            console.log(updateResult.data);
            console.log("success");
        }

    } catch (error) {
        console.log(error.response);
        res.status(200).redirect("http://localhost/hotc/match");
    }
}

module.exports.getmatchList = async(req,res)=>{
    try {
        const result = await axios({
            url:`http://192.168.11.11:3000/api/Organ`,
            method:'GET',
        });

        const getorganlists= [];
        const promise = result.data.map(async(element)=>{
            if(element.status === "MATCHED"){
                const getdonor = await axios({
                    url:`http://192.168.11.11:3000/api/Donor/${element.donor.split("#")[1]}`,
                    method:'GET'
                });
                const getreceiver = await axios({
                    url:`http://192.168.11.11:3000/api/Recipient/${element.recipient.split("#")[1]}`,
                    method:'GET',
                });
                element.donor = getdonor.data;
                element.receiver = getreceiver.data;
                getorganlists.push(element);
            }
        });
        await Promise.all(promise);
        res.locals.organlists = getorganlists;
    } catch (error) {
      console.log(error.response);  
    }
    
    res.status(200).render(`${dir}/getmatchlist`);
}

