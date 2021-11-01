import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import Header from '../Layout/Header';
import ChatBox from './ChatBox';
import Conversations from './Conversations';
import Users from './Users';
import { useGetUsers } from "../Services/userService";

const useStyles = makeStyles(theme => ({
    paper: {
        minHeight: 'calc(100vh - 64px)',
        borderRadius: 0,
    },
    sidebar: {
        zIndex: 8,
    },
    subheader: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
    },
    globe: {
        backgroundColor: theme.palette.primary.dark,
    },
    subheaderText: {
        color: theme.palette.primary.dark,
    },
    forCount:{
        marginRight:"30px",
        marginTop:"15px",
        fontSize:"15px"
    },
}));

const Chat = () => {
    const [scope, setScope] = useState('Global Chat');
    const [tab, setTab] = useState(0);
    const [user, setUser] = useState(null);
    const [userLength, setUserLength] = useState(null);
    const classes = useStyles();
    const getUsers = useGetUsers();

    const handleChange = (e, newVal) => {
        setTab(newVal);
    };
    useEffect(() => {
        getUsers().then((res) => setUserLength(res.length));
    },[userLength]);

    return (
        <React.Fragment>
            <Header/>
            <Grid container>
                <Grid item md={4} className={classes.sidebar}>
                    <Paper className={classes.paper} square elevation={5}>
                        <Paper square>
                            <Tabs
                                onChange={handleChange}
                                variant="fullWidth"
                                value={tab}
                                indicatorColor="primary"
                                textColor="primary"
                            >
                                <Tab label="Chats"/>
                                <Tab label="Users"/>
                                <Tab label="Number of contacts"/>
                            </Tabs>
                        </Paper>
                        {tab === 0 && (
                            <Conversations
                                setUser={setUser}
                                setScope={setScope}
                            />
                        )}
                        {tab === 1 && (
                            <Users setUser={setUser} setScope={setScope}
                            />
                        )}
                        {tab===2 && (
                            <div style={{
                                textAlign:"center",fontSize:"50px"}}>{userLength}</div>

                        )}
                    </Paper>

                </Grid>
                <Grid item md={8}>
                    <ChatBox scope={scope} user={user}/>
                </Grid>
            </Grid>
        </React.Fragment>
    );
};

export default Chat;
