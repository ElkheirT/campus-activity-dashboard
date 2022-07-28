import "./App.css";
import temperatureIcon from './images/thermometer.svg'
import humidityIcon from './images/humidity.svg'
import RefreshIcon from '@mui/icons-material/Refresh';
import {
    AppBar,
    Box, Button,
    Container,
    Grid,
    Stack,
    Toolbar,
    Typography
} from "@mui/material";
import Chart from "./Chart";
import io from 'socket.io-client'
import {db} from './db'
import {useEffect, useState} from "react";
import InfoCard from "./InfoCard";
import Histogram from "./Histogram";

function App() {
    let currentTime = new Date();
    // assume library is open from 7AM to 10PM
    let openTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 7, 0, 0);
    let closeTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 22, 0, 0);

    let prevOpenTime = new Date(openTime.getTime());
    let prevCloseTime = new Date(closeTime.getTime());

    prevOpenTime.setDate(prevOpenTime.getDate() - 1);
    prevCloseTime.setDate(prevCloseTime.getDate() - 1);

    const socket = io('localhost:5000');

    useEffect(() => {
        if (!localStorage.getItem('lastFetchTime')) {
            localStorage.setItem('lastFetchTime', openTime.toString());
        }

        getLatestData();

        socket.emit('get_data_stream');

        socket.on('past_data', (data) => {
            if (data.length > 0) {
                data.forEach((element) => {
                    addToDB(element);
                });
                let mostRecentFetch = data[data.length - 1].time_stamp;
                localStorage.setItem('lastFetchTime', mostRecentFetch);
            }
        });

        socket.on('new_data_point', (data) => {
            addToDB(data);
            let mostRecentFetch = data.time_stamp;
            localStorage.setItem('lastFetchTime', mostRecentFetch);
        });
    }, []);

    function getDataFromPrevDay() {
        getDataInRange(prevOpenTime, prevCloseTime);
    }

    function getLatestData() {
        let lastFetchTime = localStorage.getItem('lastFetchTime');
        getDataInRange(new Date(lastFetchTime), closeTime);
    }

    function getDataInRange(startDate, endDate) {
        socket.emit('get_data_in_range', {
            startDate: dateToString(startDate),
            endDate: dateToString(endDate)
        });
    }

    function dateToString(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    }

    async function addToDB(data) {
        try {
            /* store data.time_stamp as a JS Date object,
            so we can run date queries using dexie.js */
            let timeStamp = data.time_stamp;
            data.time_stamp = new Date(timeStamp);
            const id = await db.sensorData.add(data);
        } catch (error) {
            console.log("Failed to add data: ", error);
        }
    }

    return (<div className="App">
            <Box>
                <AppBar position={"static"}>
                    <Toolbar>
                        <Typography variant={"h6"}>
                            Campus Activity Dashboard
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Container maxWidth={"xl"}>
                    <Stack direction={"row"} justifyContent={"center"} spacing={2} sx={{m: 4}}>
                        <InfoCard
                            icon={temperatureIcon}
                            title={"Temp"}
                            text={"70°"}
                        />
                        <InfoCard
                            icon={humidityIcon}
                            title={"Humidity"}
                            text={"67%"}
                        />
                        <Button onClick={getLatestData}>
                            <RefreshIcon fontSize="large"/>
                        </Button>
                    </Stack>
                    <Grid container justifyContent={"center"} spacing={5}>
                        <Grid item lg={6} md={8} sm={10}>
                            <Chart openTime={openTime} closeTime={closeTime}/>
                        </Grid>
                        <Grid item lg={6} md={8} sm={10}>
                            <Histogram openTime={prevOpenTime} closeTime={prevCloseTime}/>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </div>
    );
}

export default App;